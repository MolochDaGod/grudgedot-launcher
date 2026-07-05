import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { GrudgeEmbed } from '@/components/GrudgeEmbed';
import { FORGE_ROUTE_DEFAULTS, forgeUrl, type ForgeLaunchContext } from '@shared/forgeUrls';

export interface ForgeEditorProps {
  from?: ForgeLaunchContext;
  mode?: string;
  title?: string;
}

/**
 * Embeds forge.grudge-studio.com — the canonical Grudge Studio editor.
 * Route defaults live in shared/forgeUrls.ts; URL query ?from=&mode= overrides.
 */
export default function ForgeEditorPage({ from, mode, title }: ForgeEditorProps = {}) {
  const [location] = useLocation();

  const src = useMemo(() => {
    const defaults = FORGE_ROUTE_DEFAULTS[location.split('?')[0]];
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : '',
    );
    const resolvedFrom = (params.get('from') as ForgeLaunchContext | null) ?? from ?? defaults?.from ?? 'launcher';
    const resolvedMode = params.get('mode') ?? mode ?? defaults?.mode;
    return forgeUrl({ from: resolvedFrom, mode: resolvedMode ?? undefined });
  }, [location, from, mode]);

  const embedTitle =
    title ??
    FORGE_ROUTE_DEFAULTS[location.split('?')[0]]?.title ??
    'Grudge Studio Forge';

  return (
    <GrudgeEmbed
      src={src}
      title={embedTitle}
      allowFullscreen
      showExternalLink
      minHeight="calc(100vh - 3.5rem)"
    />
  );
}