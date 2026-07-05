import { useEffect, useRef } from 'react';

interface LoadingVideoOverlayProps {
  src: string;
  message?: string;
  ready: boolean;
  poster?: string;
}

/** Full-screen loading video — loops until `ready`, then fades out. */
export function LoadingVideoOverlay({ src, message, ready, poster }: LoadingVideoOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || ready) return;
    v.currentTime = 0;
    void v.play().catch(() => {});
  }, [src, ready]);

  if (ready) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black"
      data-testid="loading-video-overlay"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        loop
        playsInline
        autoPlay
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
      {message && (
        <p
          className="relative z-10 mt-auto mb-10 px-6 text-center text-sm tracking-wide text-white/75"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {message}
        </p>
      )}
    </div>
  );
}