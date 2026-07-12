import { useCallback, useEffect, useState } from 'react';
import { GrudgeEmbed } from '@/components/GrudgeEmbed';
import { Button } from '@/components/ui/button';
import { GAME_URLS } from '@shared/gameUrls';

/** Canonical R2 cinematic — Gruda Armada RTS Star (GrudgeSpaceRTS) */
export const ARMADA_INTRO_CDN =
  'https://assets.grudge-studio.com/gruda-armada/space/videos/intro.mp4';

const GAME_URL = `${GAME_URLS.spaceRts}?hub=1`;

/**
 * Armada Saga — Gruda Armada RTS Star (GrudgeSpaceRTS).
 * Plays the fleet intro from R2, then embeds the live space RTS.
 */
export default function ArmadaSagaTab() {
  const [phase, setPhase] = useState<'intro' | 'play'>('intro');

  const enterGame = useCallback(() => setPhase('play'), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'intro') return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') enterGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, enterGame]);

  if (phase === 'intro') {
    return (
      <div
        className="relative min-h-screen bg-black overflow-hidden cursor-pointer"
        onClick={enterGame}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') enterGame();
        }}
      >
        <video
          src={ARMADA_INTRO_CDN}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          playsInline
          onEnded={enterGame}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3 z-10 pointer-events-none">
          <p className="text-xs tracking-[0.35em] uppercase text-cyan-300/70 font-mono">
            Gruda Armada · RTS Star
          </p>
          <Button
            type="button"
            className="pointer-events-auto bg-cyan-600 hover:bg-cyan-500"
            onClick={(e) => {
              e.stopPropagation();
              enterGame();
            }}
          >
            Enter Command
          </Button>
          <p className="text-[10px] text-white/40 font-mono animate-pulse">Click or press Enter to skip</p>
        </div>
      </div>
    );
  }

  return (
    <GrudgeEmbed
      src={GAME_URL}
      title="Armada Saga — Gruda Armada RTS Star"
      allowFullscreen
      showExternalLink
      minHeight="100vh"
    />
  );
}