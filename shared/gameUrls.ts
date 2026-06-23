/**
 * Canonical live URLs for embedded Grudge games.
 * Prefer *.grudge-studio.com custom domains over raw *.vercel.app hosts.
 * Never reference dead projects (e.g. standalone-grudge.vercel.app).
 */
export const GAME_URLS = {
  client: 'https://client.grudge-studio.com',
  arena: 'https://grudge-arena.vercel.app',
  armada: 'https://armada.grudge-studio.com',
  nemesis: 'https://nexus-nemesis-game.vercel.app',
  warlordsRts: 'https://grudge-warlords-rts.vercel.app/play',
  bettaWarlords: 'https://client.grudge-studio.com/play',
} as const;