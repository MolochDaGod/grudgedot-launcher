import { useState } from 'react';
import { SceneInterstitial } from '@/components/drift/SceneInterstitial';

interface GameOpenSequenceProps {
  introSrc: string;
  trailerSrc: string;
  poster?: string;
  onComplete: () => void;
}

/** Plays intro → trailer when opening Grudge Velocity, then reveals the hub. */
export function GameOpenSequence({ introSrc, trailerSrc, poster, onComplete }: GameOpenSequenceProps) {
  const [step, setStep] = useState<'intro' | 'trailer'>('intro');

  if (step === 'intro') {
    return (
      <SceneInterstitial
        src={introSrc}
        poster={poster}
        onComplete={() => setStep('trailer')}
      />
    );
  }

  return (
    <SceneInterstitial
      src={trailerSrc}
      poster={poster}
      onComplete={onComplete}
    />
  );
}