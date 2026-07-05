/**
 * Grudge Studio Forge — canonical browser editor at forge.grudge-studio.com
 * Replaces the in-launcher Babylon editor and local three-engine authoring shell.
 */
export const FORGE_ORIGIN = 'https://forge.grudge-studio.com';

export type ForgeLaunchContext =
  | 'launcher'
  | 'launcher-engine'
  | 'launcher-scene'
  | 'launcher-map'
  | 'launcher-effects'
  | 'launcher-warlord'
  | 'launcher-hub'
  | 'launcher-three';

export interface ForgeUrlOptions {
  from?: ForgeLaunchContext;
  mode?: string;
  path?: string;
  /** Extra query params forwarded to Forge (e.g. project id). */
  params?: Record<string, string | undefined>;
}

export function forgeUrl(options: ForgeUrlOptions = {}): string {
  const url = new URL(options.path ?? '/', FORGE_ORIGIN);
  if (options.from) url.searchParams.set('from', options.from);
  if (options.mode) url.searchParams.set('mode', options.mode);
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/** Per-launcher-route defaults when embedding Forge in an iframe. */
export const FORGE_ROUTE_DEFAULTS: Record<
  string,
  { title: string; from: ForgeLaunchContext; mode?: string }
> = {
  '/forge': { title: 'Grudge Studio Forge', from: 'launcher' },
  '/engine': { title: 'Grudge Studio Forge', from: 'launcher-engine', mode: 'scene' },
  '/three-engine': { title: 'Grudge Studio Forge', from: 'launcher-three', mode: 'scene' },
  '/map-editor': { title: 'Grudge Studio Forge — Maps', from: 'launcher-map', mode: 'map' },
  '/effects': { title: 'Grudge Studio Forge — Effects', from: 'launcher-effects', mode: 'effects' },
  '/warlords': { title: 'Grudge Studio Forge — Warlords', from: 'launcher-warlord' },
  '/babygrudge': { title: 'Grudge Studio Forge', from: 'launcher-hub' },
};