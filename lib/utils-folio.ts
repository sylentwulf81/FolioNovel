import { BlockNode } from './types';

// Word tokenizer: split on whitespace, ignore scene-break ornaments
export function countWords(text: string): number {
  if (!text) return 0;
  // Strip HTML tags if present
  const stripped = text.replace(/<[^>]*>/g, ' ');
  // Strip scene break characters (·, bullets, dashes)
  const clean = stripped.replace(/[·•]/g, ' ').trim();
  if (!clean) return 0;
  const tokens = clean.split(/\s+/).filter((t) => t.length > 0);
  return tokens.length;
}

export function countBlocksWordCount(blocks: BlockNode[]): number {
  let count = 0;
  for (const block of blocks) {
    if (block.type === 'paragraph') {
      const text = block.text || block.html || '';
      count += countWords(text);
    }
  }
  return count;
}

export function formatRelativeDate(timestamp: number): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Generates a simple default abstract cover for newly created novels
export function generateCoverPlaceholder(title: string): string {
  const safeTitle = (title || 'UNTITLED').toUpperCase().slice(0, 24);
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
    <rect width="600" height="800" fill="%23EFE9DC"/>
    <rect x="24" y="24" width="552" height="752" fill="none" stroke="%23DDD4C5" stroke-width="1.5"/>
    <line x1="300" y1="240" x2="300" y2="340" stroke="%236B2D2D" stroke-width="2"/>
    <circle cx="300" cy="370" r="4" fill="%236B2D2D"/>
    <text x="300" y="440" font-family="Source Serif 4, Georgia, serif" font-size="28" font-weight="500" letter-spacing="3" fill="%231C1917" text-anchor="middle">${encodeURIComponent(safeTitle)}</text>
    <text x="300" y="475" font-family="Source Sans 3, system-ui, sans-serif" font-size="12" letter-spacing="2" fill="%2357534E" text-anchor="middle">MANUSCRIPT</text>
  </svg>`;
}
