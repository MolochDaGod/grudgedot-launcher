/**
 * Canonical live URLs for embedded Grudge games.
 * Sourced from shared/fleetEras.ts — do not hardcode vercel.app hosts here.
 */
import { resolveFleetUrl, BLOCKLIST_URLS } from './fleetEras';

export const GAME_URLS = {
  client: resolveFleetUrl('warlords-client'),
  play: resolveFleetUrl('warlords-play'),
  arena: resolveFleetUrl('arena'),
  armada: resolveFleetUrl('armada'),
  /** Gruda Armada RTS Star — tactical space RTS (GrudgeSpaceRTS) */
  spaceRts: resolveFleetUrl('space-rts'),
  nemesis: resolveFleetUrl('nemesis'),
  warlordsRts: resolveFleetUrl('warlords-rts'),
  bettaWarlords: `${resolveFleetUrl('warlords-client')}/play`,
  survival: resolveFleetUrl('survival'),
  drive: resolveFleetUrl('drive'),
  dcq: resolveFleetUrl('dcq'),
  platform: resolveFleetUrl('platform'),
  heroRts: resolveFleetUrl('hero-rts'),
  heroRtsPlay: `${resolveFleetUrl('hero-rts')}/?play=1`,
} as const;

export { BLOCKLIST_URLS };