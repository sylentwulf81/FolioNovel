import { Folio, Chapter } from './types';

/**
 * Escapes characters for RTF specification:
 * - Backslashes, braces
 * - Non-ASCII unicode characters via \uN?
 * - Preserves standard ASCII formatting
 */
function escapeRtfText(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = text.charCodeAt(i);

    if (char === '\\') {
      result += '\\\\';
    } else if (char === '{') {
      result += '\\{';
    } else if (char === '}') {
      result += '\\}';
    } else if (code > 127) {
      // RTF Unicode sequence: \uN? where N is 16-bit signed integer
      const signedCode = code > 32767 ? code - 65536 : code;
      result += `\\u${signedCode}?`;
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Parses inline HTML tags (<b>, <strong>, <i>, <em>, <u>, <span>, <br>) into corresponding RTF control words.
 */
function convertHtmlToRtf(html: string): string {
  if (!html) return '';

  // Clean empty breaks
  if (html === '<br>' || html === '<br/>') return '';

  // Normalize common tags
  let working = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Tokenize tags and text
  const tagRegex = /(<\/?(?:b|strong|i|em|u|span|p|div)[^>]*>)/gi;
  const parts = working.split(tagRegex);

  let rtf = '';
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;

  for (const part of parts) {
    if (!part) continue;

    const lower = part.toLowerCase();

    if (lower.startsWith('<strong') || lower.startsWith('<b')) {
      if (!isBold) {
        rtf += '\\b ';
        isBold = true;
      }
    } else if (lower.startsWith('</strong') || lower.startsWith('</b')) {
      if (isBold) {
        rtf += '\\b0 ';
        isBold = false;
      }
    } else if (lower.startsWith('<em') || lower.startsWith('<i')) {
      if (!isItalic) {
        rtf += '\\i ';
        isItalic = true;
      }
    } else if (lower.startsWith('</em') || lower.startsWith('</i')) {
      if (isItalic) {
        rtf += '\\i0 ';
        isItalic = false;
      }
    } else if (lower.startsWith('<u')) {
      if (!isUnderline) {
        rtf += '\\ul ';
        isUnderline = true;
      }
    } else if (lower.startsWith('</u')) {
      if (isUnderline) {
        rtf += '\\ulnone ';
        isUnderline = false;
      }
    } else if (lower.startsWith('<span') || lower.startsWith('</span') || lower.startsWith('<p') || lower.startsWith('</p') || lower.startsWith('<div') || lower.startsWith('</div')) {
      // Ignore wrapper tags, styles handled by parents
    } else {
      // Raw text content
      const escaped = escapeRtfText(part);
      rtf += escaped.replace(/\n/g, '\\line ');
    }
  }

  // Close any tags left unclosed
  if (isUnderline) rtf += '\\ulnone ';
  if (isItalic) rtf += '\\i0 ';
  if (isBold) rtf += '\\b0 ';

  return rtf;
}

/**
 * Exports an entire novel (Folio + all Chapters in order) as a standard Rich Text Format (.rtf) file.
 * RTF preserves bold, italics, underline, chapter headings, and scene breaks across
 * Microsoft Word, Apple Pages, Google Docs, and Scrivener.
 */
export function generateNovelRTF(folio: Folio, chapters: Chapter[]): string {
  const title = escapeRtfText(folio.title || 'Untitled Manuscript');
  const premise = folio.premise ? escapeRtfText(folio.premise) : '';

  // Sort chapters according to folio.chapterOrder if available
  const sorted = [...chapters];
  if (folio.chapterOrder && folio.chapterOrder.length > 0) {
    const orderMap = new Map<string, number>();
    folio.chapterOrder.forEach((id, idx) => orderMap.set(id, idx));
    sorted.sort((a, b) => {
      const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : a.order;
      const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : b.order;
      return orderA - orderB;
    });
  } else {
    sorted.sort((a, b) => a.order - b.order);
  }

  let body = '';

  // Novel Title & Premise Header Page
  body += `\\qc\\b\\fs48 ${title}\\b0\\fs24\\par\n`;
  if (premise) {
    body += `\\i\\fs24 ${premise}\\i0\\par\n`;
  }
  body += `\\par\\par\\par\\ql\n`; // blank vertical spacing

  // Render Each Chapter
  sorted.forEach((chap, idx) => {
    // If not first chapter, insert page break
    if (idx > 0) {
      body += `\\page\n`;
    }

    const chapTitle = escapeRtfText(chap.title || `Chapter ${idx + 1}`);
    // Chapter Title Heading
    body += `\\qc\\b\\fs36 ${chapTitle}\\b0\\fs24\\par\n`;
    body += `\\par\\par\\ql\n`;

    // Chapter Content Blocks
    chap.content.forEach((block) => {
      if (block.type === 'sceneBreak') {
        // Centered standard scene break
        body += `\\qc\\fs24 * * *\\par\\ql\\par\n`;
      } else {
        const paragraphRtf = convertHtmlToRtf(block.html || block.text || '');
        if (paragraphRtf.trim().length > 0) {
          // Standard manuscript paragraph indent (\fi360 is ~0.25 inch)
          body += `\\fi360\\sa120\\sl360\\slmult1 ${paragraphRtf}\\par\n`;
        } else {
          // Blank line
          body += `\\par\n`;
        }
      }
    });

    body += `\\par\n`;
  });

  // Complete standard RTF 1.5 document structure with Georgia font
  const rtfDoc = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat
{\\fonttbl{\\f0\\froman\\fcharset0 Georgia;}{\\f1\\froman\\fcharset0 Times New Roman;}}
{\\colortbl ;\\red28\\green25\\blue23;\\red107\\green45\\blue45;}
\\viewkind4\\uc1\\pard\\cf1\\f0\\fs24\\sl360\\slmult1
${body}
}`;

  return rtfDoc;
}
