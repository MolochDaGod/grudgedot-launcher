/**
 * Grudge Studio Fleet Eras — canonical source of truth.
 *
 * Three product eras share studio-core infrastructure but own disjoint
 * subdomain namespaces. A subdomain belongs to exactly ONE era (or core).
 *
 * Rules:
 *   1. studio-core hosts auth/api/assets — never era-branded game content
 *   2. Each era has a primary portal URL + allowed subdomain prefix set
 *   3. Embeds/launcher must use `canonicalUrl` from this file, not raw vercel.app
 *   4. Dead hosts are blocklisted — never reassign without explicit migration
 */

export type FleetEra = 'studio-core' | 'warlords' | 'nexus' | 'armada';

export type DeployPlatform = 'vercel' | 'cloudflare-worker' | 'cloudflare-pages' | 'railway' | 'r2' | 'tunnel';

export interface FleetEntry {
  id: string;
  era: FleetEra;
  label: string;
  repo?: string;
  vercelProject?: string;
  /** Production URL players/tools should use */
  canonicalUrl: string;
  /** Fallback when custom domain DNS is still propagating */
  fallbackUrl?: string;
  platform: DeployPlatform;
  status: 'live' | 'planned' | 'deprecated' | 'broken';
  notes?: string;
}

/** Shared infrastructure — NOT owned by any game era */
export const STUDIO_CORE: FleetEntry[] = [
  { id: 'api', era: 'studio-core', label: 'Game API', canonicalUrl: 'https://api.grudge-studio.com', platform: 'tunnel', status: 'live', repo: 'grudge-backend' },
  { id: 'id', era: 'studio-core', label: 'Grudge ID', canonicalUrl: 'https://id.grudge-studio.com', platform: 'tunnel', status: 'live', repo: 'grudge-backend' },
  { id: 'assets', era: 'studio-core', label: 'Asset CDN (R2)', canonicalUrl: 'https://assets.grudge-studio.com', platform: 'r2', status: 'live' },
  { id: 'ai', era: 'studio-core', label: 'AI Gateway', canonicalUrl: 'https://ai.grudge-studio.com', platform: 'cloudflare-worker', status: 'live', repo: 'grudge-ai-hub' },
  { id: 'objectstore', era: 'studio-core', label: 'ObjectStore', canonicalUrl: 'https://objectstore.grudge-studio.com', platform: 'cloudflare-worker', status: 'live', repo: 'ObjectStore' },
  { id: 'dash', era: 'studio-core', label: 'Admin Dashboard', canonicalUrl: 'https://dash.grudge-studio.com', platform: 'tunnel', status: 'live', repo: 'grudge-studio-dash' },
  { id: 'libs', era: 'studio-core', label: 'Game Core SDK', canonicalUrl: 'https://libs.grudge-studio.com', platform: 'vercel', status: 'live', vercelProject: 'grudge-game-core', repo: 'grudge-game-core' },
  { id: 'ui', era: 'studio-core', label: 'UI Editor', canonicalUrl: 'https://ui.grudge-studio.com', platform: 'vercel', status: 'live', vercelProject: 'grudge-ui-editor' },
  { id: 'info', era: 'studio-core', label: 'Game Data Hub', canonicalUrl: 'https://info.grudge-studio.com', platform: 'vercel', status: 'live', vercelProject: 'objectstore-grudge' },
  { id: 'portal', era: 'studio-core', label: 'Studio Portal (apex)', canonicalUrl: 'https://grudge-studio.com', platform: 'vercel', status: 'live', vercelProject: 'the-engine', repo: 'The-ENGINE' },
  { id: 'launcher', era: 'studio-core', label: 'GrudgeDot Launcher', canonicalUrl: 'https://launcher.grudge-studio.com', fallbackUrl: 'https://dev.grudge-studio.com', platform: 'vercel', status: 'live', vercelProject: 'grudgedot-launcher', repo: 'grudgedot-launcher' },
  { id: 'studio-editor', era: 'studio-core', label: 'Studio Editor', canonicalUrl: 'https://studio.grudge-studio.com', platform: 'vercel', status: 'live', vercelProject: 'grudge-studio-editor' },
  { id: 'characters', era: 'studio-core', label: 'Character Playground', canonicalUrl: 'https://characters.grudge-studio.com', platform: 'vercel', status: 'live', vercelProject: 'playground' },
  { id: 'grudge6', era: 'studio-core', label: 'Grudge6 Character Viewer', canonicalUrl: 'https://grudge6.grudge-studio.com', platform: 'vercel', status: 'live', vercelProject: 'grudge-character-creator' },
  { id: 'fleet', era: 'studio-core', label: 'Fleet Map', canonicalUrl: 'https://fleet.grudge-studio.com', platform: 'vercel', status: 'live', repo: 'grudge-fleet' },
  { id: 'coder', era: 'studio-core', label: 'GrudaChain IDE', canonicalUrl: 'https://coder.grudge-studio.com', platform: 'cloudflare-pages', status: 'live' },
];

/** Warlords Era — fantasy MMORPG, island, crafting, classic RTS */
export const WARLORDS_ERA: FleetEntry[] = [
  { id: 'warlords-client', era: 'warlords', label: 'Grudge Warlords (main client)', canonicalUrl: 'https://client.grudge-studio.com', fallbackUrl: 'https://grudgewarlords.com', platform: 'vercel', status: 'live', vercelProject: 'grudge-builder', repo: 'Grudge-Builder' },
  { id: 'warlords-play', era: 'warlords', label: 'Warlords play shortcut', canonicalUrl: 'https://play.grudge-studio.com', platform: 'vercel', status: 'live', vercelProject: 'star-way-gruda-web-client' },
  { id: 'wcs', era: 'warlords', label: 'Warlord Crafting Suite', canonicalUrl: 'https://wcs.grudge-studio.com', platform: 'cloudflare-pages', status: 'live', repo: 'grudge-wcs' },
  { id: 'arena', era: 'warlords', label: 'Grudge Arena', canonicalUrl: 'https://arena.grudge-studio.com', fallbackUrl: 'https://grudge-arena.vercel.app', platform: 'vercel', status: 'live', vercelProject: 'grudge-arena', repo: 'grudge-arena' },
  { id: 'survival', era: 'warlords', label: 'Survival (Grudges)', canonicalUrl: 'https://grudges.grudge-studio.com', platform: 'vercel', status: 'live', vercelProject: 'survival', repo: 'survival' },
  { id: 'drive', era: 'warlords', label: 'Grudge Drive', canonicalUrl: 'https://drive.grudge-studio.com', platform: 'vercel', status: 'live', vercelProject: 'grudge-drive', repo: 'grudge-drive' },
  { id: 'dcq', era: 'warlords', label: 'Dungeon Crawler Quest', canonicalUrl: 'https://dcq.grudge-studio.com', platform: 'vercel', status: 'live', vercelProject: 'dungeon-crawler-quest', repo: 'Dungeon-Crawler-Quest' },
  { id: 'rts-grudge', era: 'warlords', label: 'RTS-Grudge', canonicalUrl: 'https://rts-grudge.vercel.app', platform: 'vercel', status: 'live', vercelProject: 'rts-grudge', repo: 'RTS-Grudge' },
  { id: 'warlords-rts', era: 'warlords', label: 'Grudge Warlords RTS', canonicalUrl: 'https://grudge-warlords-rts.vercel.app/play', platform: 'vercel', status: 'live', vercelProject: 'grudge-warlords-rts' },
  { id: 'mech', era: 'warlords', label: 'Mech Playground', canonicalUrl: 'https://mech-playground.vercel.app', platform: 'vercel', status: 'live', vercelProject: 'mech-playground', repo: 'grudge-mech-forge' },
  { id: 'wow-bridge', era: 'warlords', label: 'WoW Arena Bridge', canonicalUrl: 'https://wow.grudge-studio.com', platform: 'vercel', status: 'live', vercelProject: 'wow-frontend', repo: 'grudge-arena-bridge' },
  { id: 'wcs-vercel', era: 'warlords', label: 'WCS (Vercel mirror)', canonicalUrl: 'https://warlord-crafting-suite.vercel.app', platform: 'vercel', status: 'live', vercelProject: 'warlord-crafting-suite' },
];

/** Nexus Era — Web3 TCG, platform hub, trading card games */
export const NEXUS_ERA: FleetEntry[] = [
  { id: 'platform', era: 'nexus', label: 'Grudge Platform (Web3 hub)', canonicalUrl: 'https://grudgeplatform.io', fallbackUrl: 'https://platform.grudge-studio.com', platform: 'vercel', status: 'live', vercelProject: 'grudge-platform', repo: 'grudge-platform' },
  { id: 'nemesis', era: 'nexus', label: 'Nexus Nemesis TCG', canonicalUrl: 'https://nemesis.grudge-studio.com', fallbackUrl: 'https://nexus-nemesis-game.vercel.app', platform: 'vercel', status: 'live', vercelProject: 'nexus-nemesis-game', repo: 'nexus-nemesis-game' },
  { id: 'gruda-wars', era: 'nexus', label: 'Gruda Wars hub', canonicalUrl: 'https://gruda-wars.vercel.app', platform: 'vercel', status: 'live', vercelProject: 'gruda-wars' },
];

/** Armada Era — space/naval RTS, galactic campaign */
export const ARMADA_ERA: FleetEntry[] = [
  { id: 'armada', era: 'armada', label: 'Grim Armada', canonicalUrl: 'https://armada.grudge-studio.com', fallbackUrl: 'https://grim-armada-web.vercel.app', platform: 'vercel', status: 'live', vercelProject: 'grim-armada-web', repo: 'grim-armada-web' },
  { id: 'space-rts', era: 'armada', label: 'GrudgeSpace RTS', canonicalUrl: 'https://grudge-space-rts.vercel.app', platform: 'vercel', status: 'live', vercelProject: 'grudge-space-rts', repo: 'GrudgeSpaceRTS' },
  { id: 'grand-battle', era: 'armada', label: 'Grand Battle Arena', canonicalUrl: 'https://grand-battle-arena.vercel.app', platform: 'vercel', status: 'live', vercelProject: 'grand-battle-arena' },
  { id: 'hero-rts', era: 'armada', label: 'Hero Commander RTS', canonicalUrl: 'https://hero-rts.vercel.app', platform: 'vercel', status: 'live', vercelProject: 'hero-rts' },
];

/**
 * DNS aliases — valid Cloudflare records that mirror a canonical entry.
 * These do NOT appear in SUBDOMAIN_ERA (only one canonical host per game).
 */
export interface FleetDnsAlias {
  host: string;
  era: FleetEra;
  canonicalId: string;
  recordType: 'CNAME' | 'A' | 'AAAA';
  notes?: string;
}

export const FLEET_DNS_ALIASES: FleetDnsAlias[] = [
  { host: 'dev.grudge-studio.com', era: 'studio-core', canonicalId: 'launcher', recordType: 'CNAME', notes: 'Launcher staging' },
  { host: 'platform.grudge-studio.com', era: 'nexus', canonicalId: 'platform', recordType: 'CNAME', notes: 'Nexus mirror (canonical: grudgeplatform.io)' },
  { host: 'grudge-arena.grudge-studio.com', era: 'warlords', canonicalId: 'arena', recordType: 'CNAME', notes: 'Legacy arena hostname' },
  { host: 'survival.grudge-studio.com', era: 'warlords', canonicalId: 'survival', recordType: 'CNAME', notes: 'Legacy → grudges.grudge-studio.com' },
  { host: 'apps.grudge-studio.com', era: 'studio-core', canonicalId: 'portal', recordType: 'CNAME', notes: 'Apps shell' },
  { host: 'browse.grudge-studio.com', era: 'studio-core', canonicalId: 'objectstore', recordType: 'CNAME', notes: 'ObjectStore Pages mirror' },
  { host: 'grudgedot.grudge-studio.com', era: 'studio-core', canonicalId: 'launcher', recordType: 'CNAME', notes: 'CF Pages launcher mirror' },
  { host: 'ws.grudge-studio.com', era: 'studio-core', canonicalId: 'api', recordType: 'CNAME', notes: 'WebSocket tunnel' },
  { host: 'ale.grudge-studio.com', era: 'studio-core', canonicalId: 'ai', recordType: 'CNAME', notes: 'AI tunnel alias' },
];

/** Era namespace ownership — disjoint subdomain sets (validated at sweep time) */
export const ERA_NAMESPACES: Record<Exclude<FleetEra, 'studio-core'>, string[]> = {
  warlords: WARLORDS_ERA.map((e) => new URL(e.canonicalUrl).hostname).filter((h) => h.endsWith('.grudge-studio.com')).map((h) => h.replace('.grudge-studio.com', '')),
  nexus: NEXUS_ERA.map((e) => new URL(e.canonicalUrl).hostname).filter((h) => h.endsWith('.grudge-studio.com')).map((h) => h.replace('.grudge-studio.com', '')),
  armada: ARMADA_ERA.map((e) => new URL(e.canonicalUrl).hostname).filter((h) => h.endsWith('.grudge-studio.com')).map((h) => h.replace('.grudge-studio.com', '')),
};

/** Hosts that must NEVER be linked — retired Vercel projects */
export const BLOCKLIST_URLS = [
  'https://standalone-grudge.vercel.app',
  'https://grudachain.vercel.app',
] as const;

export const ALL_FLEET_ENTRIES: FleetEntry[] = [
  ...STUDIO_CORE,
  ...WARLORDS_ERA,
  ...NEXUS_ERA,
  ...ARMADA_ERA,
];

/** Subdomain → era lookup (first label only, e.g. "armada" from armada.grudge-studio.com) */
export const SUBDOMAIN_ERA: Record<string, FleetEra> = Object.fromEntries(
  ALL_FLEET_ENTRIES
    .map((e) => {
      const host = new URL(e.canonicalUrl).hostname;
      const sub = host.endsWith('.grudge-studio.com')
        ? host.replace('.grudge-studio.com', '')
        : null;
      return sub ? [sub, e.era] as const : null;
    })
    .filter((x): x is [string, FleetEra] => x !== null),
);

export function getFleetEntry(id: string): FleetEntry | undefined {
  return ALL_FLEET_ENTRIES.find((e) => e.id === id);
}

export function entriesForEra(era: FleetEra): FleetEntry[] {
  return ALL_FLEET_ENTRIES.filter((e) => e.era === era);
}

/** Resolve URL preferring custom domain; falls back if primary is blocklisted */
export function resolveFleetUrl(id: string): string {
  const entry = getFleetEntry(id);
  if (!entry) throw new Error(`Unknown fleet entry: ${id}`);
  return entry.canonicalUrl;
}

/** Assert registry integrity — throws on duplicate ids or cross-era subdomain conflicts */
export function validateFleetRegistry(): string[] {
  const errors: string[] = [];
  const ids = new Map<string, string>();
  const subdomains = new Map<string, { era: FleetEra; id: string }>();

  for (const e of ALL_FLEET_ENTRIES) {
    if (ids.has(e.id)) errors.push(`Duplicate id: ${e.id}`);
    else ids.set(e.id, e.era);

    const host = new URL(e.canonicalUrl).hostname;
    if (!host.endsWith('.grudge-studio.com')) continue;
    const sub = host.replace('.grudge-studio.com', '');
    const prev = subdomains.get(sub);
    if (prev) {
      errors.push(`Subdomain conflict: ${sub} — [${prev.era}] ${prev.id} vs [${e.era}] ${e.id}`);
    } else {
      subdomains.set(sub, { era: e.era, id: e.id });
    }
  }
  return errors;
}