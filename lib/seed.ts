import { Folio, Chapter, BlockNode } from './types';

// Minimalist abstract cover: muted dunes, warm bone, charcoal wash, touch of dried-ink burgundy
export const DEFAULT_SALT_ROAD_COVER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
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

  <!-- Canvas Page -->
  <rect width="600" height="800" fill="url(%23skyGrad)"/>
  
  <!-- Faint border -->
  <rect x="24" y="24" width="552" height="752" fill="none" stroke="%23D2C8B8" stroke-width="1.5"/>
  <rect x="28" y="28" width="544" height="744" fill="none" stroke="%23E7E0D4" stroke-width="0.5"/>

  <!-- Dried-ink burgundy sun circle (minimalist) -->
  <circle cx="300" cy="290" r="44" fill="%236B2D2D" opacity="0.85"/>

  <!-- Geometric dune layers -->
  <path d="M24 530 Q 180 470 340 510 T 576 460 L 576 776 L 24 776 Z" fill="url(%23dune3)"/>
  <path d="M24 590 Q 210 520 400 580 T 576 540 L 576 776 L 24 776 Z" fill="url(%23dune2)"/>
  <path d="M24 670 Q 260 590 576 650 L 576 776 L 24 776 Z" fill="url(%23dune1)"/>

  <!-- Title & Understated Header -->
  <text x="300" y="140" font-family="Source Serif 4, Georgia, serif" font-size="34" font-weight="400" letter-spacing="4" fill="%231C1917" text-anchor="middle">THE SALT ROAD</text>
  <line x1="270" y1="165" x2="330" y2="165" stroke="%2357534E" stroke-width="1"/>
  <text x="300" y="195" font-family="Source Sans 3, system-ui, sans-serif" font-size="12" letter-spacing="3" fill="%2357534E" text-anchor="middle">A MANUSCRIPT</text>
</svg>`;

export function createDefaultSeed(): { folio: Folio; chapters: Chapter[] } {
  const novelId = 'novel-the-salt-road';
  const chap1Id = 'chap-salt-road-1';
  const chap2Id = 'chap-salt-road-2';
  const chap3Id = 'chap-salt-road-3';
  const now = Date.now();

  const chap1Content: BlockNode[] = [
    {
      id: 'b1',
      type: 'paragraph',
      html: 'The crust of Lake Terrene sounded like unglazed porcelain beneath the surveyor’s boots. Before noon, the heat had already bleached the horizon to the color of dry bone, erasing any seam between the alkaline flats and the sky.',
      text: 'The crust of Lake Terrene sounded like unglazed porcelain beneath the surveyor’s boots. Before noon, the heat had already bleached the horizon to the color of dry bone, erasing any seam between the alkaline flats and the sky.',
    },
    {
      id: 'b2',
      type: 'paragraph',
      html: 'Jonas carried sixty yards of brass chain, two iron pegs, and a notebook bound in oilcloth. The boundary stones had been set fifty years before the water receded, but the treaties remained as brittle as the mud.',
      text: 'Jonas carried sixty yards of brass chain, two iron pegs, and a notebook bound in oilcloth. The boundary stones had been set fifty years before the water receded, but the treaties remained as brittle as the mud.',
    },
    {
      id: 'b3',
      type: 'sceneBreak',
    },
    {
      id: 'b4',
      type: 'paragraph',
      html: 'At Mile Fourteen he found the first wooden cairn, tipped eastward by thirty winters of salt-wind. A copper tag remained wired to the juniper post, stamped with the numeral seven. He scraped the white crust from its face with his thumb and recorded the bearing in ink that dried before the nib had left the paper.',
      text: 'At Mile Fourteen he found the first wooden cairn, tipped eastward by thirty winters of salt-wind. A copper tag remained wired to the juniper post, stamped with the numeral seven. He scraped the white crust from its face with his thumb and recorded the bearing in ink that dried before the nib had left the paper.',
    },
  ];

  const chap2Content: BlockNode[] = [
    {
      id: 'b5',
      type: 'paragraph',
      html: 'By dusk, the wind reversed, coming down from the basalt ridge cold and sharp with pulverized gypsum. Jonas sheltered beside an old cattle cistern whose galvanized lid had warped open long ago.',
      text: 'By dusk, the wind reversed, coming down from the basalt ridge cold and sharp with pulverized gypsum. Jonas sheltered beside an old cattle cistern whose galvanized lid had warped open long ago.',
    },
    {
      id: 'b6',
      type: 'paragraph',
      html: 'He gathered dry sage twigs and built a flame no wider than his palm. Over it he heated a cup of well water, drinking it slowly to spare the remaining canteens strapped to the pack frame.',
      text: 'He gathered dry sage twigs and built a flame no wider than his palm. Over it he heated a cup of well water, drinking it slowly to spare the remaining canteens strapped to the pack frame.',
    },
    {
      id: 'b7',
      type: 'sceneBreak',
    },
    {
      id: 'b8',
      type: 'paragraph',
      html: 'In the stillness that followed the twilight, a lantern flickered two miles north along the dry canal. It did not move with the rhythm of a man walking; it rose and fell in place, like a beacon tethered to an empty skiff.',
      text: 'In the stillness that followed the twilight, a lantern flickered two miles north along the dry canal. It did not move with the rhythm of a man walking; it rose and fell in place, like a beacon tethered to an empty skiff.',
    },
  ];

  const chap3Content: BlockNode[] = [
    {
      id: 'b9',
      type: 'paragraph',
      html: 'Dawn was only an amber crease along the mountains when Jonas packed his iron pegs. The night frost had turned the salt granular, crackling like sea grit under foot.',
      text: 'Dawn was only an amber crease along the mountains when Jonas packed his iron pegs. The night frost had turned the salt granular, crackling like sea grit under foot.',
    },
    {
      id: 'b10',
      type: 'paragraph',
      html: 'He walked toward the dry canal where the light had rested. Where he expected ashes or a tent ring, he found only a surveyor’s brass benchmark, sunk plumb into granite bedrock.',
      text: 'He walked toward the dry canal where the light had rested. Where he expected ashes or a tent ring, he found only a surveyor’s brass benchmark, sunk plumb into granite bedrock.',
    },
    {
      id: 'b11',
      type: 'paragraph',
      html: 'The stone bore no date, only a carved compass rose with the needle pointing true south toward the vanished lake. Jonas laid his palm upon the bronze disc. It was still warm to the touch.',
      text: 'The stone bore no date, only a carved compass rose with the needle pointing true south toward the vanished lake. Jonas laid his palm upon the bronze disc. It was still warm to the touch.',
    },
  ];

  const chapters: Chapter[] = [
    {
      id: chap1Id,
      novelId,
      title: 'The White Flats',
      content: chap1Content,
      wordCount: 104,
      order: 0,
      updatedAt: now - 3600000 * 24,
    },
    {
      id: chap2Id,
      novelId,
      title: 'Cisterns and Cinders',
      content: chap2Content,
      wordCount: 97,
      order: 1,
      updatedAt: now - 3600000 * 12,
    },
    {
      id: chap3Id,
      novelId,
      title: 'A Morrow of Silt',
      content: chap3Content,
      wordCount: 108,
      order: 2,
      updatedAt: now - 3600000 * 2,
    },
  ];

  const folio: Folio = {
    id: novelId,
    title: 'The Salt Road',
    premise: 'A solitary surveyor traverses the dried basin of Lake Terrene in search of an unmapped border stone.',
    status: 'draft',
    targetLength: 50000,
    deadline: '2026-11-30',
    coverBlob: DEFAULT_SALT_ROAD_COVER,
    createdAt: now - 3600000 * 48,
    updatedAt: now - 3600000 * 2,
    chapterOrder: [chap1Id, chap2Id, chap3Id],
  };

  return { folio, chapters };
}
