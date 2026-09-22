export interface CoverTemplate {
  id: string;
  name: string;
  description: string;
  theme: 'desert' | 'forest' | 'ocean' | 'mountain' | 'prairie' | 'night' | 'linen';
  generate: (title: string, subtitle?: string) => string;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatTitleSvg(title: string, yPos: number = 140, maxFontSize: number = 32): { svg: string; bottomY: number } {
  const clean = (title || 'UNTITLED').trim().toUpperCase();
  const escaped = escapeXml(clean);
  
  // If title is long, break into two lines
  if (clean.length > 20) {
    const words = clean.split(/\s+/);
    let line1 = '';
    let line2 = '';
    for (const w of words) {
      if ((line1 + ' ' + w).trim().length <= 18) {
        line1 = (line1 + ' ' + w).trim();
      } else {
        line2 = (line2 + ' ' + w).trim();
      }
    }
    const fontSize = 24;
    const l1Esc = escapeXml(line1 || clean.slice(0, 18));
    const l2Esc = escapeXml(line2 || clean.slice(18));
    return {
      svg: `
        <text x="300" y="${yPos - 14}" font-family="Source Serif 4, Georgia, serif" font-size="${fontSize}" font-weight="400" letter-spacing="3" text-anchor="middle">${l1Esc}</text>
        <text x="300" y="${yPos + 18}" font-family="Source Serif 4, Georgia, serif" font-size="${fontSize}" font-weight="400" letter-spacing="3" text-anchor="middle">${l2Esc}</text>
      `,
      bottomY: yPos + 35,
    };
  }

  const fontSize = clean.length > 14 ? 26 : maxFontSize;
  return {
    svg: `<text x="300" y="${yPos}" font-family="Source Serif 4, Georgia, serif" font-size="${fontSize}" font-weight="400" letter-spacing="4" text-anchor="middle">${escaped}</text>`,
    bottomY: yPos + 15,
  };
}

export const COVER_TEMPLATES: CoverTemplate[] = [
  {
    id: 'desert-dunes',
    name: 'Desert Dunes',
    description: 'The Salt Road palette with layered silt dunes and dried-ink crimson sun',
    theme: 'desert',
    generate: (title: string, subtitle = 'A MANUSCRIPT') => {
      const { svg: titleSvg, bottomY } = formatTitleSvg(title, 135, 34);
      const subEsc = escapeXml((subtitle || 'A MANUSCRIPT').toUpperCase());
      const lineY = bottomY + 14;
      const subY = lineY + 28;

      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="%23F4EFE6"/>
      <stop offset="55%" stop-color="%23EBE4D8"/>
      <stop offset="100%" stop-color="%23D8CFBE"/>
    </linearGradient>
    <linearGradient id="dune1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%234A443F"/>
      <stop offset="100%" stop-color="%232D2926"/>
    </linearGradient>
    <linearGradient id="dune2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%238C8275"/>
      <stop offset="100%" stop-color="%23685F54"/>
    </linearGradient>
    <linearGradient id="dune3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%23C2B8A6"/>
      <stop offset="100%" stop-color="%23A89D8B"/>
    </linearGradient>
  </defs>

  <rect width="600" height="800" fill="url(%23skyGrad)"/>
  <rect x="24" y="24" width="552" height="752" fill="none" stroke="%23D2C8B8" stroke-width="1.5"/>
  <rect x="28" y="28" width="544" height="744" fill="none" stroke="%23E7E0D4" stroke-width="0.5"/>

  <circle cx="300" cy="290" r="44" fill="%236B2D2D" opacity="0.85"/>

  <path d="M24 530 Q 180 470 340 510 T 576 460 L 576 776 L 24 776 Z" fill="url(%23dune3)"/>
  <path d="M24 590 Q 210 520 400 580 T 576 540 L 576 776 L 24 776 Z" fill="url(%23dune2)"/>
  <path d="M24 670 Q 260 590 576 650 L 576 776 L 24 776 Z" fill="url(%23dune1)"/>

  <g fill="%231C1917">${titleSvg}</g>
  <line x1="270" y1="${lineY}" x2="330" y2="${lineY}" stroke="%2357534E" stroke-width="1"/>
  <text x="300" y="${subY}" font-family="Source Sans 3, system-ui, sans-serif" font-size="11" letter-spacing="3" fill="%2357534E" text-anchor="middle">${subEsc}</text>
</svg>`;
    },
  },

  {
    id: 'pine-fog',
    name: 'Misty Pines',
    description: 'Serene sage fog with layered evergreen ridgelines and warm ochre sun',
    theme: 'forest',
    generate: (title: string, subtitle = 'A NOVEL') => {
      const { svg: titleSvg, bottomY } = formatTitleSvg(title, 135, 34);
      const subEsc = escapeXml((subtitle || 'A NOVEL').toUpperCase());
      const lineY = bottomY + 14;
      const subY = lineY + 28;

      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <defs>
    <linearGradient id="fogGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="%23EEF3ED"/>
      <stop offset="55%" stop-color="%23DFE7DF"/>
      <stop offset="100%" stop-color="%23CAD7CA"/>
    </linearGradient>
    <linearGradient id="ridge1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%23223023"/>
      <stop offset="100%" stop-color="%23151F16"/>
    </linearGradient>
    <linearGradient id="ridge2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%23445846"/>
      <stop offset="100%" stop-color="%23324233"/>
    </linearGradient>
    <linearGradient id="ridge3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%237A937C"/>
      <stop offset="100%" stop-color="%23627A64"/>
    </linearGradient>
  </defs>

  <rect width="600" height="800" fill="url(%23fogGrad)"/>
  <rect x="24" y="24" width="552" height="752" fill="none" stroke="%23B6C9B6" stroke-width="1.5"/>
  <rect x="28" y="28" width="544" height="744" fill="none" stroke="%23DCE6DC" stroke-width="0.5"/>

  <circle cx="300" cy="290" r="44" fill="%23C29B38" opacity="0.85"/>

  <path d="M24 510 L 80 480 L 150 515 L 230 470 L 320 520 L 410 465 L 490 505 L 576 455 L 576 776 L 24 776 Z" fill="url(%23ridge3)"/>
  <path d="M24 580 L 100 540 L 180 585 L 270 530 L 370 590 L 470 535 L 576 570 L 576 776 L 24 776 Z" fill="url(%23ridge2)"/>
  <path d="M24 660 L 140 610 L 260 670 L 400 600 L 576 650 L 576 776 L 24 776 Z" fill="url(%23ridge1)"/>

  <g fill="%23172219">${titleSvg}</g>
  <line x1="270" y1="${lineY}" x2="330" y2="${lineY}" stroke="%234A5F4C" stroke-width="1"/>
  <text x="300" y="${subY}" font-family="Source Sans 3, system-ui, sans-serif" font-size="11" letter-spacing="3" fill="%234A5F4C" text-anchor="middle">${subEsc}</text>
</svg>`;
    },
  },

  {
    id: 'ocean-swell',
    name: 'Ocean Tide',
    description: 'Deep nautical midnight slate with stylized rhythmic wave crests and pearl moon',
    theme: 'ocean',
    generate: (title: string, subtitle = 'A MANUSCRIPT') => {
      const { svg: titleSvg, bottomY } = formatTitleSvg(title, 135, 34);
      const subEsc = escapeXml((subtitle || 'A MANUSCRIPT').toUpperCase());
      const lineY = bottomY + 14;
      const subY = lineY + 28;

      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <defs>
    <linearGradient id="seaNight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="%231F2735"/>
      <stop offset="55%" stop-color="%23171E2A"/>
      <stop offset="100%" stop-color="%230E131C"/>
    </linearGradient>
    <linearGradient id="wave1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%23131B27"/>
      <stop offset="100%" stop-color="%230A0E15"/>
    </linearGradient>
    <linearGradient id="wave2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%2326354B"/>
      <stop offset="100%" stop-color="%23182333"/>
    </linearGradient>
    <linearGradient id="wave3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%23435876"/>
      <stop offset="100%" stop-color="%2330415A"/>
    </linearGradient>
  </defs>

  <rect width="600" height="800" fill="url(%23seaNight)"/>
  <rect x="24" y="24" width="552" height="752" fill="none" stroke="%23414E64" stroke-width="1.5"/>
  <rect x="28" y="28" width="544" height="744" fill="none" stroke="%232A3446" stroke-width="0.5"/>

  <circle cx="300" cy="285" r="42" fill="%23E4E8EE" opacity="0.9"/>

  <path d="M24 530 C 140 480, 200 550, 320 500 C 420 460, 500 520, 576 480 L 576 776 L 24 776 Z" fill="url(%23wave3)"/>
  <path d="M24 600 C 120 550, 240 620, 360 560 C 460 510, 520 580, 576 540 L 576 776 L 24 776 Z" fill="url(%23wave2)"/>
  <path d="M24 680 C 180 620, 320 700, 440 640 C 500 610, 540 650, 576 630 L 576 776 L 24 776 Z" fill="url(%23wave1)"/>

  <g fill="%23F4EFE6">${titleSvg}</g>
  <line x1="270" y1="${lineY}" x2="330" y2="${lineY}" stroke="%23677A97" stroke-width="1"/>
  <text x="300" y="${subY}" font-family="Source Sans 3, system-ui, sans-serif" font-size="11" letter-spacing="3" fill="%239BB1CF" text-anchor="middle">${subEsc}</text>
</svg>`;
    },
  },

  {
    id: 'mountain-pass',
    name: 'Alpine Summit',
    description: 'Dusk shale and basalt ridgelines with terracotta ember accent disc',
    theme: 'mountain',
    generate: (title: string, subtitle = 'A CHRONICLE') => {
      const { svg: titleSvg, bottomY } = formatTitleSvg(title, 135, 34);
      const subEsc = escapeXml((subtitle || 'A CHRONICLE').toUpperCase());
      const lineY = bottomY + 14;
      const subY = lineY + 28;

      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <defs>
    <linearGradient id="alpineGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="%23F5ECE4"/>
      <stop offset="55%" stop-color="%23E7D9CF"/>
      <stop offset="100%" stop-color="%23D3C1B5"/>
    </linearGradient>
    <linearGradient id="shale1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%23302622"/>
      <stop offset="100%" stop-color="%231E1714"/>
    </linearGradient>
    <linearGradient id="shale2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%23615149"/>
      <stop offset="100%" stop-color="%23483B34"/>
    </linearGradient>
    <linearGradient id="shale3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%23948378"/>
      <stop offset="100%" stop-color="%237C6D63"/>
    </linearGradient>
  </defs>

  <rect width="600" height="800" fill="url(%23alpineGrad)"/>
  <rect x="24" y="24" width="552" height="752" fill="none" stroke="%23C9B8AC" stroke-width="1.5"/>
  <rect x="28" y="28" width="544" height="744" fill="none" stroke="%23E4D6CB" stroke-width="0.5"/>

  <circle cx="300" cy="290" r="44" fill="%23A14431" opacity="0.85"/>

  <polygon points="24,530 180,440 310,500 440,410 576,500 576,776 24,776" fill="url(%23shale3)"/>
  <polygon points="24,610 130,520 280,590 420,490 576,580 576,776 24,776" fill="url(%23shale2)"/>
  <polygon points="24,690 220,570 380,660 510,590 576,640 576,776 24,776" fill="url(%23shale1)"/>

  <g fill="%231E1714">${titleSvg}</g>
  <line x1="270" y1="${lineY}" x2="330" y2="${lineY}" stroke="%235C4E46" stroke-width="1"/>
  <text x="300" y="${subY}" font-family="Source Sans 3, system-ui, sans-serif" font-size="11" letter-spacing="3" fill="%236B594F" text-anchor="middle">${subEsc}</text>
</svg>`;
    },
  },

  {
    id: 'golden-prairie',
    name: 'Golden Prairie',
    description: 'Warm late-afternoon amber horizon with rolling ochre grassland sweeps',
    theme: 'prairie',
    generate: (title: string, subtitle = 'A MANUSCRIPT') => {
      const { svg: titleSvg, bottomY } = formatTitleSvg(title, 135, 34);
      const subEsc = escapeXml((subtitle || 'A MANUSCRIPT').toUpperCase());
      const lineY = bottomY + 14;
      const subY = lineY + 28;

      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <defs>
    <linearGradient id="prairieGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="%23FAF3E5"/>
      <stop offset="55%" stop-color="%23EFE3C7"/>
      <stop offset="100%" stop-color="%23DFCFAA"/>
    </linearGradient>
    <linearGradient id="field1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%233D2C19"/>
      <stop offset="100%" stop-color="%23281C0E"/>
    </linearGradient>
    <linearGradient id="field2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%237D623C"/>
      <stop offset="100%" stop-color="%235E4728"/>
    </linearGradient>
    <linearGradient id="field3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%23BFA375"/>
      <stop offset="100%" stop-color="%23A18456"/>
    </linearGradient>
  </defs>

  <rect width="600" height="800" fill="url(%23prairieGrad)"/>
  <rect x="24" y="24" width="552" height="752" fill="none" stroke="%23CDBA93" stroke-width="1.5"/>
  <rect x="28" y="28" width="544" height="744" fill="none" stroke="%23E7D7B9" stroke-width="0.5"/>

  <circle cx="300" cy="290" r="44" fill="%23753026" opacity="0.85"/>

  <path d="M24 540 Q 200 480 380 530 T 576 490 L 576 776 L 24 776 Z" fill="url(%23field3)"/>
  <path d="M24 610 Q 170 540 320 600 T 576 560 L 576 776 L 24 776 Z" fill="url(%23field2)"/>
  <path d="M24 680 Q 240 600 420 670 T 576 630 L 576 776 L 24 776 Z" fill="url(%23field1)"/>

  <g fill="%23261C10">${titleSvg}</g>
  <line x1="270" y1="${lineY}" x2="330" y2="${lineY}" stroke="%23614C33" stroke-width="1"/>
  <text x="300" y="${subY}" font-family="Source Sans 3, system-ui, sans-serif" font-size="11" letter-spacing="3" fill="%236B5338" text-anchor="middle">${subEsc}</text>
</svg>`;
    },
  },

  {
    id: 'celestial-nocturne',
    name: 'Midnight Solitude',
    description: 'Charcoal obsidian canvas with delicate celestial ring and crescent moon',
    theme: 'night',
    generate: (title: string, subtitle = 'A MANUSCRIPT') => {
      const { svg: titleSvg, bottomY } = formatTitleSvg(title, 135, 34);
      const subEsc = escapeXml((subtitle || 'A MANUSCRIPT').toUpperCase());
      const lineY = bottomY + 14;
      const subY = lineY + 28;

      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <defs>
    <linearGradient id="nightGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="%23181A22"/>
      <stop offset="55%" stop-color="%23111319"/>
      <stop offset="100%" stop-color="%230A0B0E"/>
    </linearGradient>
    <linearGradient id="shadowSlope" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%231F222C"/>
      <stop offset="100%" stop-color="%230F1015"/>
    </linearGradient>
  </defs>

  <rect width="600" height="800" fill="url(%23nightGrad)"/>
  <rect x="24" y="24" width="552" height="752" fill="none" stroke="%234A4D59" stroke-width="1.5"/>
  <rect x="28" y="28" width="544" height="744" fill="none" stroke="%232D303A" stroke-width="0.5"/>

  <!-- Celestial ring & moon -->
  <circle cx="300" cy="300" r="64" fill="none" stroke="%23656A7A" stroke-width="0.75" stroke-dasharray="3 3"/>
  <circle cx="300" cy="300" r="38" fill="%23E4DFD5" opacity="0.95"/>
  <circle cx="314" cy="296" r="32" fill="%23181A22"/>

  <!-- Horizon line & minimal landscape -->
  <line x1="120" y1="520" x2="480" y2="520" stroke="%234A4D59" stroke-width="0.75"/>
  <path d="M24 640 Q 200 580 360 630 T 576 600 L 576 776 L 24 776 Z" fill="url(%23shadowSlope)"/>
  <circle cx="300" cy="520" r="3" fill="%23C29B38"/>

  <g fill="%23F4EFE6">${titleSvg}</g>
  <line x1="270" y1="${lineY}" x2="330" y2="${lineY}" stroke="%2372788C" stroke-width="1"/>
  <text x="300" y="${subY}" font-family="Source Sans 3, system-ui, sans-serif" font-size="11" letter-spacing="3" fill="%239AA1B5" text-anchor="middle">${subEsc}</text>
</svg>`;
    },
  },

  {
    id: 'classical-linen',
    name: 'Clothbound Plate',
    description: 'Timeless bookcloth cream with geometric ornamental borders and burgundy seal',
    theme: 'linen',
    generate: (title: string, subtitle = 'FIRST EDITION') => {
      const { svg: titleSvg, bottomY } = formatTitleSvg(title, 270, 32);
      const subEsc = escapeXml((subtitle || 'FIRST EDITION').toUpperCase());
      const lineY = bottomY + 16;
      const subY = lineY + 28;

      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <defs>
    <linearGradient id="linenGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="%23F7F2E8"/>
      <stop offset="50%" stop-color="%23EFE7DA"/>
      <stop offset="100%" stop-color="%23DFD5C4"/>
    </linearGradient>
  </defs>

  <rect width="600" height="800" fill="url(%23linenGrad)"/>
  <rect x="24" y="24" width="552" height="752" fill="none" stroke="%23C8BEAD" stroke-width="2"/>
  <rect x="32" y="32" width="536" height="736" fill="none" stroke="%23DDD3C3" stroke-width="0.75"/>
  <rect x="42" y="42" width="516" height="716" fill="none" stroke="%23C8BEAD" stroke-width="1"/>

  <!-- Corner corner diamonds -->
  <polygon points="42,42 47,47 42,52 37,47" fill="%236B2D2D"/>
  <polygon points="558,42 563,47 558,52 553,47" fill="%236B2D2D"/>
  <polygon points="42,758 47,763 42,768 37,763" fill="%236B2D2D"/>
  <polygon points="558,758 563,763 558,768 553,763" fill="%236B2D2D"/>

  <!-- Center emblem / seal -->
  <circle cx="300" cy="180" r="28" fill="%236B2D2D"/>
  <polygon points="300,165 310,180 300,195 290,180" fill="%23F7F2E8"/>

  <g fill="%231C1917">${titleSvg}</g>
  <line x1="260" y1="${lineY}" x2="340" y2="${lineY}" stroke="%236B2D2D" stroke-width="1.5"/>
  <text x="300" y="${subY}" font-family="Source Sans 3, system-ui, sans-serif" font-size="11" letter-spacing="3" fill="%2357534E" text-anchor="middle">${subEsc}</text>

  <!-- Lower colophon mark -->
  <line x1="285" y1="620" x2="315" y2="620" stroke="%23C8BEAD" stroke-width="1"/>
  <circle cx="300" cy="635" r="3" fill="%236B2D2D"/>
</svg>`;
    },
  },
];

export function getCoverTemplate(id: string): CoverTemplate {
  return COVER_TEMPLATES.find((t) => t.id === id) || COVER_TEMPLATES[0];
}

export function generateThemedCover(templateId: string, title: string, subtitle?: string): string {
  const template = getCoverTemplate(templateId);
  return template.generate(title, subtitle);
}
