import { useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface SceneInterstitialProps {
  src: string;
  onComplete: () => void;
  poster?: string;
}

export function SceneInterstitial({ src, onComplete, poster }: SceneInterstitialProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    void v.play().catch(() => finish());
  }, [src, finish]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black"
      data-testid="scene-interstitial"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="h-full w-full object-cover"
        muted
        playsInline
        autoPlay
        onEnded={finish}
        onError={finish}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="absolute bottom-6 right-6 border-white/25 bg-black/50 text-white/80 hover:bg-black/70 hover:text-white"
        onClick={finish}
      >
        Skip
      </Button>
    </div>
  );
}