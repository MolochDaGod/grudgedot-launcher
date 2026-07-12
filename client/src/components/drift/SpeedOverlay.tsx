import type { SpeedPresentationState } from '@/lib/drift/types';

interface SpeedOverlayProps {
  fx: SpeedPresentationState;
  isDrifting: boolean;
  nitroActive: boolean;
  isOffTrack?: boolean;
}

export function SpeedOverlay({ fx, isDrifting, nitroActive, isOffTrack }: SpeedOverlayProps) {
  const vignetteOpacity = isOffTrack ? Math.max(fx.vignette, 0.55) : fx.vignette;
  const blurStrength = fx.motionBlur;
  const lineOpacity = fx.speedRatio * 0.55 + (nitroActive ? 0.25 : 0);
  const driftGlow = isDrifting ? fx.driftIntensity * 0.35 : 0;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Speed vignette */}
      <div
        className="absolute inset-0 transition-opacity duration-75"
        style={{
          background: isOffTrack
            ? `radial-gradient(ellipse at center, transparent 25%, rgba(120,20,40,${vignetteOpacity * 0.85}) 55%, rgba(0,0,0,${vignetteOpacity}) 100%)`
            : `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
          opacity: 1,
        }}
      />

      {/* Nitro / high-speed edge streaks */}
      <div
        className="absolute inset-0"
        style={{
          opacity: lineOpacity,
          background: `
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              transparent 40px,
              rgba(255,255,255,0.03) 40px,
              rgba(255,255,255,0.03) 42px
            )
          `,
          transform: `scaleX(${1 + blurStrength * 0.08})`,
          filter: `blur(${blurStrength * 1.5}px)`,
        }}
      />

      {/* Radial speed warp */}
      {(fx.speedRatio > 0.35 || nitroActive) && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 60%, transparent 20%, rgba(255,50,80,${nitroActive ? 0.12 : 0.04}) 70%, rgba(0,0,0,${blurStrength * 0.2}) 100%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Drift sparks tint */}
      {isDrifting && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background: `linear-gradient(135deg, transparent 60%, rgba(255,180,50,${driftGlow}) 100%)`,
            mixBlendMode: 'overlay',
          }}
        />
      )}

      {/* Corner speed lines */}
      {fx.speedRatio > 0.5 && (
        <>
          <div
            className="absolute left-0 top-1/2 h-px w-1/4 -translate-y-1/2"
            style={{
              background: `linear-gradient(90deg, rgba(255,255,255,${fx.speedRatio * 0.4}), transparent)`,
              boxShadow: `0 0 20px rgba(255,100,120,${fx.speedRatio * 0.3})`,
            }}
          />
          <div
            className="absolute right-0 top-1/2 h-px w-1/4 -translate-y-1/2"
            style={{
              background: `linear-gradient(270deg, rgba(255,255,255,${fx.speedRatio * 0.4}), transparent)`,
              boxShadow: `0 0 20px rgba(100,180,255,${fx.speedRatio * 0.3})`,
            }}
          />
        </>
      )}
    </div>
  );
}