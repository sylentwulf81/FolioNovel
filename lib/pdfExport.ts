import type { BlockNode, Chapter, Folio } from './types';

/**
 * Manuscript PDF for Folio.
 * Uses the standard Times family (no embedded font) and WinAnsi so the file
 * stays small and text-extractable for editors and chat tools.
 */

type Style = { bold: boolean; italic: boolean };
type Run = Style & { text: string };
type Token = Style & { text: string; space: boolean };
type Piece = Style & { text: string };
type Line = { pieces: Piece[]; width: number; align: 'left' | 'center'; size: number; leading: number };

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_X = 72;
const MARGIN_TOP = 72;
const MARGIN_BOTTOM = 68;
const BODY = 11;
const LEADING = 16;

/** Times-Roman widths, 1/1000 em, from the Adobe AFM. */
const TIMES_WIDTHS: Record<number, number> = {
  32: 250, 33: 333, 34: 408, 35: 500, 36: 500, 37: 833, 38: 778, 39: 180,
  40: 333, 41: 333, 42: 500, 43: 564, 44: 250, 45: 333, 46: 250, 47: 278,
  48: 500, 49: 500, 50: 500, 51: 500, 52: 500, 53: 500, 54: 500, 55: 500,
  56: 500, 57: 500, 58: 278, 59: 278, 60: 564, 61: 564, 62: 564, 63: 444,
  64: 921, 65: 722, 66: 667, 67: 667, 68: 722, 69: 611, 70: 556, 71: 722,
  72: 722, 73: 333, 74: 389, 75: 722, 76: 611, 77: 889, 78: 722, 79: 722,
  80: 556, 81: 722, 82: 667, 83: 556, 84: 611, 85: 722, 86: 722, 87: 944,
  88: 722, 89: 722, 90: 611, 91: 333, 92: 278, 93: 333, 94: 469, 95: 500,
  96: 333, 97: 444, 98: 500, 99: 444, 100: 500, 101: 444, 102: 333, 103: 500,
  104: 500, 105: 278, 106: 278, 107: 500, 108: 278, 109: 778, 110: 500,
  111: 500, 112: 500, 113: 500, 114: 333, 115: 389, 116: 278, 117: 500,
  118: 500, 119: 722, 120: 500, 121: 500, 122: 444, 123: 480, 124: 200,
  125: 480, 126: 541,
};

const UNICODE_TO_WIN: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
  0x00a0: 0xa0,
};

function winByte(code: number): number | null {
  if (code === 0x0a || code === 0x0d || code === 0x09) return 0x20;
  if (code >= 32 && code <= 126) return code;
  if (code >= 160 && code <= 255) return code;
  const mapped = UNICODE_TO_WIN[code];
  if (mapped !== undefined) return mapped;
  return null;
}

function fallbackChar(code: number): number {
  if (code === 0x2011 || code === 0x2010 || code === 0x2212) return 0x2d;
  if (code === 0x00ad) return 0x2d;
  if (code === 0x2018 || code === 0x2019 || code === 0x201a || code === 0x201b || code === 0x2032) return 0x27;
  if (code === 0x201c || code === 0x201d || code === 0x201e || code === 0x201f || code === 0x2033) return 0x22;
  return 0x3f;
}

function toWinAnsi(text: string): number[] {
  const bytes: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code === 0x200b || code === 0xfeff || code === 0x00ad) continue;
    const byte = winByte(code);
    bytes.push(byte !== null ? byte : fallbackChar(code));
  }
  return bytes;
}

function charWidth(byte: number, size: number, bold: boolean): number {
  let units = TIMES_WIDTHS[byte];
  if (units === undefined) {
    if (byte === 0x97 || byte === 0x85) units = 1000;
    else if (byte === 0x96) units = 500;
    else units = 500;
  }
  const width = (units / 1000) * size;
  return bold ? width * 1.06 : width;
}

function textWidth(text: string, size: number, style: Style): number {
  const bytes = toWinAnsi(text);
  let w = 0;
  for (const b of bytes) w += charWidth(b, size, style.bold);
  if (style.italic) w *= 1.02;
  return w;
}

function pdfLiteral(text: string): string {
  const bytes = toWinAnsi(text);
  let out = '';
  for (const b of bytes) {
    if (b === 0x5c) out += '\\\\';
    else if (b === 0x28) out += '\\(';
    else if (b === 0x29) out += '\\)';
    else if (b === 0x0d) out += '\\r';
    else if (b >= 32 && b <= 126) out += String.fromCharCode(b);
    else out += '\\' + b.toString(8).padStart(3, '0');
  }
  return out;
}

function fontName(style: Style): string {
  if (style.bold && style.italic) return 'F4';
  if (style.bold) return 'F2';
  if (style.italic) return 'F3';
  return 'F1';
}

function decodeEntities(text: string): string {
  const named: Array<[string, string]> = [
    ['&nbsp;', ' '],
    ['&amp;', '&'],
    ['&lt;', '<'],
    ['&gt;', '>'],
    ['&quot;', '"'],
    ['&apos;', "'"],
  ];
  let out = text;
  for (const [entity, value] of named) {
    out = out.replace(new RegExp(entity, 'gi'), value);
  }
  out = out.replace(/&#39;/gi, "'");
  out = out.replace(/&#(\d+);/g, (_, n) => {
    const code = Number(n);
    return Number.isFinite(code) ? String.fromCodePoint(code) : '';
  });
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, n) => {
    const code = parseInt(n, 16);
    return Number.isFinite(code) ? String.fromCodePoint(code) : '';
  });
  return out;
}

function htmlToParagraphs(html: string): Run[][] {
  const source = decodeEntities(html || '').replace(/\r\n/g, '\n');
  const paragraphs: Run[][] = [[]];
  let bold = false;
  let italic = false;
  let i = 0;

  const pushText = (text: string) => {
    if (!text) return;
    const current = paragraphs[paragraphs.length - 1];
    current.push({ text, bold, italic });
  };

  const breakParagraph = () => {
    const current = paragraphs[paragraphs.length - 1];
    if (current.length > 0) paragraphs.push([]);
  };

  while (i < source.length) {
    if (source[i] !== '<') {
      const next = source.indexOf('<', i);
      const chunk = source.slice(i, next === -1 ? source.length : next);
      pushText(chunk.replace(/\s+/g, ' '));
      i = next === -1 ? source.length : next;
      continue;
    }
    const close = source.indexOf('>', i);
    if (close === -1) {
      pushText(source.slice(i));
      break;
    }
    const raw = source.slice(i + 1, close).trim();
    i = close + 1;
    const isClose = raw.startsWith('/');
    const name = raw.replace(/^\//, '').split(/\s+/)[0].toLowerCase();
    if (name === 'br') {
      breakParagraph();
    } else if (name === 'p' || name === 'div') {
      if (isClose) breakParagraph();
      else if (paragraphs[paragraphs.length - 1].length > 0) paragraphs.push([]);
    } else if (name === 'b' || name === 'strong') {
      bold = !isClose;
    } else if (name === 'i' || name === 'em') {
      italic = !isClose;
    }
  }

  return paragraphs
    .map((runs) => {
      const cleaned = runs
        .map((run) => ({ ...run, text: run.text.replace(/\s+/g, ' ') }))
        .filter((run) => run.text.length > 0);
      if (cleaned.length === 0) return [];
      if (cleaned[0].text.startsWith(' ')) cleaned[0] = { ...cleaned[0], text: cleaned[0].text.trimStart() };
      const last = cleaned[cleaned.length - 1];
      cleaned[cleaned.length - 1] = { ...last, text: last.text.trimEnd() };
      return cleaned.filter((run) => run.text.length > 0);
    })
    .filter((runs) => runs.some((run) => run.text.trim().length > 0));
}

function tokenize(runs: Run[]): Token[] {
  const tokens: Token[] = [];
  for (const run of runs) {
    const parts = run.text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      const space = /^\s+$/.test(part);
      tokens.push({
        text: space ? ' ' : part,
        bold: run.bold,
        italic: run.italic,
        space,
      });
    }
  }
  return tokens;
}

function wrapParagraph(runs: Run[], size: number, maxWidth: number, leading: number): Line[] {
  const tokens = tokenize(runs);
  const lines: Line[] = [];
  let pieces: Piece[] = [];
  let width = 0;

  const flush = () => {
    while (pieces.length && pieces[pieces.length - 1].text === ' ') {
      width -= textWidth(' ', size, pieces[pieces.length - 1]);
      pieces.pop();
    }
    if (pieces.length) lines.push({ pieces, width, align: 'left', size, leading });
    pieces = [];
    width = 0;
  };

  const pushPiece = (piece: Piece) => {
    const w = textWidth(piece.text, size, piece);
    const prev = pieces[pieces.length - 1];
    if (prev && prev.bold === piece.bold && prev.italic === piece.italic) {
      prev.text += piece.text;
    } else {
      pieces.push({ ...piece });
    }
    width += w;
  };

  for (const token of tokens) {
    if (token.space) {
      if (pieces.length === 0) continue;
      const w = textWidth(' ', size, token);
      if (width + w > maxWidth) {
        flush();
      } else {
        pushPiece({ text: ' ', bold: token.bold, italic: token.italic });
      }
      continue;
    }
    const w = textWidth(token.text, size, token);
    if (pieces.length && width + w > maxWidth) flush();
    if (w <= maxWidth) {
      pushPiece({ text: token.text, bold: token.bold, italic: token.italic });
      continue;
    }
    let rest = token.text;
    while (rest.length) {
      let take = rest.length;
      while (take > 1 && textWidth(rest.slice(0, take), size, token) > maxWidth) take--;
      pushPiece({ text: rest.slice(0, take), bold: token.bold, italic: token.italic });
      rest = rest.slice(take);
      if (rest.length) flush();
    }
  }
  flush();
  return lines;
}

function centerLine(text: string, size: number, style: Style, leading: number): Line {
  return {
    pieces: [{ text, ...style }],
    width: textWidth(text, size, style),
    align: 'center',
    size,
    leading,
  };
}

function sortChapters(folio: Folio, chapters: Chapter[]): Chapter[] {
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
  return sorted;
}

function chapterLines(chapter: Chapter, index: number, maxWidth: number): Line[] {
  const lines: Line[] = [];
  const title = (chapter.title || `Chapter ${index + 1}`).trim() || `Chapter ${index + 1}`;
  for (const line of wrapParagraph([{ text: title, bold: true, italic: false }], 16, maxWidth, 22)) {
    lines.push({ ...line, align: 'center' });
  }
  lines.push({ pieces: [], width: 0, align: 'left', size: BODY, leading: 10 });

  const blocks: BlockNode[] = Array.isArray(chapter.content) ? chapter.content : [];
  for (const block of blocks) {
    if (block.type === 'sceneBreak') {
      lines.push(centerLine('*  *  *', BODY, { bold: false, italic: false }, LEADING));
      lines.push({ pieces: [], width: 0, align: 'left', size: BODY, leading: 8 });
      continue;
    }
    const paragraphs = htmlToParagraphs(block.html || block.text || '');
    for (const runs of paragraphs) {
      lines.push(...wrapParagraph(runs, BODY, maxWidth, LEADING));
      lines.push({ pieces: [], width: 0, align: 'left', size: BODY, leading: 8 });
    }
  }
  return lines;
}

type Page = { lines: { line: Line; y: number }[]; number: number };

function paginate(folio: Folio, chapters: Chapter[]): Page[] {
  const maxWidth = PAGE_W - MARGIN_X * 2;
  const pages: Page[] = [];
  let linesOnPage: { line: Line; y: number }[] = [];
  let y = PAGE_H - MARGIN_TOP;

  const newPage = () => {
    pages.push({ lines: linesOnPage, number: pages.length + 1 });
    linesOnPage = [];
    y = PAGE_H - MARGIN_TOP - 14;
  };

  const ensure = (needed: number) => {
    if (y - needed < MARGIN_BOTTOM) newPage();
  };

  const place = (line: Line) => {
    ensure(line.leading);
    linesOnPage.push({ line, y });
    y -= line.leading;
  };

  const title = (folio.title || 'Untitled Manuscript').trim() || 'Untitled Manuscript';
  for (const line of wrapParagraph([{ text: title, bold: true, italic: false }], 22, maxWidth, 28)) {
    place({ ...line, align: 'center' });
  }
  if (folio.premise && folio.premise.trim()) {
    place({ pieces: [], width: 0, align: 'left', size: 11, leading: 8 });
    const premiseLines = wrapParagraph(
      [{ text: folio.premise.trim(), bold: false, italic: true }],
      11,
      maxWidth - 36,
      16
    );
    for (const line of premiseLines) place({ ...line, align: 'center' });
  }

  const ordered = sortChapters(folio, chapters);
  ordered.forEach((chapter, index) => {
    newPage();
    for (const line of chapterLines(chapter, index, maxWidth)) place(line);
  });

  if (linesOnPage.length || pages.length === 0) {
    pages.push({ lines: linesOnPage, number: pages.length + 1 });
  }
  pages.forEach((page, idx) => {
    page.number = idx + 1;
  });
  return pages;
}

function paintPage(page: Page, pageCount: number, runningTitle: string): string {
  const maxWidth = PAGE_W - MARGIN_X * 2;
  const ops: string[] = [];
  if (page.number > 1) {
    ops.push('0.4 0.4 0.4 rg');
    ops.push('BT');
    ops.push('/F3 9 Tf');
    const header = runningTitle.length > 72 ? `${runningTitle.slice(0, 69)}...` : runningTitle;
    ops.push(`1 0 0 1 ${MARGIN_X} ${PAGE_H - 46} Tm`);
    ops.push(`(${pdfLiteral(header)}) Tj`);
    ops.push('ET');
    ops.push('0 0 0 rg');
  }

  for (const { line, y } of page.lines) {
    if (line.pieces.length === 0) continue;
    let x = MARGIN_X;
    if (line.align === 'center') x = MARGIN_X + Math.max(0, (maxWidth - line.width) / 2);
    ops.push('BT');
    for (const piece of line.pieces) {
      ops.push(`/${fontName(piece)} ${line.size} Tf`);
      ops.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
      ops.push(`(${pdfLiteral(piece.text)}) Tj`);
      x += textWidth(piece.text, line.size, piece);
    }
    ops.push('ET');
  }

  if (pageCount > 1) {
    const label = String(page.number);
    const w = textWidth(label, 9, { bold: false, italic: false });
    ops.push('0.45 0.45 0.45 rg');
    ops.push('BT');
    ops.push('/F1 9 Tf');
    ops.push(`1 0 0 1 ${((PAGE_W - w) / 2).toFixed(2)} 40 Tm`);
    ops.push(`(${pdfLiteral(label)}) Tj`);
    ops.push('ET');
    ops.push('0 0 0 rg');
  }

  return ops.join('\n');
}

function pdfDocEncodingTitle(title: string): string {
  return pdfLiteral(title);
}

function buildPdf(pages: string[], title: string): Uint8Array {
  const objects: string[] = [];
  const pageCount = pages.length;
  const fontObjs = [3, 4, 5, 6];
  const infoObj = 7;
  const firstPageObj = 8;

  const pageObjNums: number[] = [];
  const streamObjNums: number[] = [];
  for (let i = 0; i < pageCount; i++) {
    pageObjNums.push(firstPageObj + i * 2);
    streamObjNums.push(firstPageObj + i * 2 + 1);
  }

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] =
    `<< /Type /Pages /Count ${pageCount} /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>';
  objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>';
  objects[6] = '<< /Type /Font /Subtype /Type1 /BaseFont /Times-BoldItalic /Encoding /WinAnsiEncoding >>';
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const created =
    `D:${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  objects[infoObj] =
    `<< /Title (${pdfDocEncodingTitle(title)}) /Creator (Folio) /Producer (Folio) /CreationDate (${created}) >>`;

  for (let i = 0; i < pageCount; i++) {
    const content = pages[i];
    objects[pageObjNums[i]] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 ${fontObjs[0]} 0 R /F2 ${fontObjs[1]} 0 R /F3 ${fontObjs[2]} 0 R /F4 ${fontObjs[3]} 0 R >> >> ` +
      `/Contents ${streamObjNums[i]} 0 R >>`;
    objects[streamObjNums[i]] =
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  }

  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];
  const count = firstPageObj + pageCount * 2 - 1;
  for (let n = 1; n <= count; n++) {
    offsets[n] = body.length;
    body += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const xrefStart = body.length;
  let xref = `xref\n0 ${count + 1}\n`;
  xref += '0000000000 65535 f \n';
  for (let n = 1; n <= count; n++) {
    xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${count + 1} /Root 1 0 R /Info ${infoObj} 0 R >>\n`;
  xref += `startxref\n${xrefStart}\n%%EOF\n`;
  body += xref;

  const bytes = new Uint8Array(body.length);
  for (let i = 0; i < body.length; i++) bytes[i] = body.charCodeAt(i) & 0xff;
  return bytes;
}

/** `The Crushing Weight 2026-09-25 16-04-12.pdf` */
export function novelPdfFileName(title: string, when: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())} ` +
    `${pad(when.getHours())}-${pad(when.getMinutes())}-${pad(when.getSeconds())}`;
  const safe =
    (title || 'Untitled Manuscript')
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'Untitled Manuscript';
  return `${safe} ${stamp}.pdf`;
}

export function generateNovelPDF(folio: Folio, chapters: Chapter[]): Uint8Array {
  const title = (folio.title || 'Untitled Manuscript').trim() || 'Untitled Manuscript';
  const pages = paginate(folio, chapters);
  const streams = pages.map((page) => paintPage(page, pages.length, title));
  return buildPdf(streams, title);
}
