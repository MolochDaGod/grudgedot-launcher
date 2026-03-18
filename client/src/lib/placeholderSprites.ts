/**
 * Inline placeholder sprites for game examples.
 * These are used when the full asset files in attached_assets/ are not available
 * (e.g. fresh clone, Vercel deployment).
 * Each sprite is a tiny SVG data URI with a colored shape and label.
 */

function makeSvgSprite(label: string, color: string, bg: string = "#222"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="4" fill="${bg}"/>
    <circle cx="32" cy="26" r="16" fill="${color}" opacity="0.9"/>
    <text x="32" y="56" font-size="8" fill="white" text-anchor="middle" font-family="sans-serif">${label}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Character sprites
export const skeletonSprite = makeSvgSprite("Skeleton", "#c8c8c8", "#1a1a2e");
export const elfArcherSprite = makeSvgSprite("Elf", "#4ade80", "#1a2e1a");
export const scourgeWarriorSprite = makeSvgSprite("Scourge", "#a855f7", "#2e1a2e");
export const orcGuardianSprite = makeSvgSprite("Orc", "#f59e0b", "#2e2a1a");
export const grudgeWarriorSprite = makeSvgSprite("Knight", "#ef4444", "#2e1a1a");
export const bossShipSprite = makeSvgSprite("Boss", "#dc2626", "#0a0a0a");
export const shipSprite = makeSvgSprite("Ship", "#6366f1", "#0a0a2e");

// Spell / effect sprites
export const fireballSprite = makeSvgSprite("Fire", "#ff6b00", "#1a0a00");
export const explosionSprite = makeSvgSprite("Boom", "#fbbf24", "#1a1200");

// Gameboard
export const gameboardImage = makeSvgSprite("Arena", "#3b82f6", "#111827");
