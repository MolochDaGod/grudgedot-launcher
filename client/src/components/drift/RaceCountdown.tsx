interface RaceCountdownProps {
  /** 3, 2, 1, or 0 for GO */
  value: number;
}

export function RaceCountdown({ value }: RaceCountdownProps) {
  const label = value <= 0 ? 'GO!' : String(value);
  const isGo = value <= 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div
        className={`font-black tracking-wider transition-all duration-150 ${
          isGo
            ? 'scale-125 text-emerald-300 drop-shadow-[0_0_30px_rgba(52,211,153,0.8)]'
            : 'scale-100 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]'
        }`}
        style={{ fontFamily: 'Orbitron, sans-serif', fontSize: isGo ? '5rem' : '6rem' }}
      >
        {label}
      </div>
    </div>
  );
}