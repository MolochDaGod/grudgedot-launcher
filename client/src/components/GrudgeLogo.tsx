/**
 * GRUDGE STUDIO — Official Wordmark Logo
 * Crown + GRUDGE STUDIO in Cinzel, amber-gold gradient, dark bg with glow border
 */
export function GrudgeLogo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-red-700 shadow-lg shadow-amber-900/40">
        <CrownIcon className="w-5 h-5 text-white" />
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-[#0c0a08] border border-amber-900/40"
      style={{ boxShadow: '0 0 20px rgba(217,119,6,0.10), inset 0 1px 0 rgba(255,180,50,0.08)' }}>
      {/* Glow backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative flex items-center gap-2.5 px-3 py-2.5">
        {/* Crown emblem */}
        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gradient-to-br from-amber-500 via-amber-600 to-red-700 flex items-center justify-center shadow-md shadow-amber-900/50">
          <CrownIcon className="w-4 h-4 text-white" />
        </div>

        {/* Wordmark */}
        <div className="flex flex-col leading-none gap-0.5">
          <span
            className="text-sm font-black tracking-[0.18em] uppercase"
            style={{
              fontFamily: 'Cinzel, serif',
              background: 'linear-gradient(135deg, #f6d860 0%, #e8971c 45%, #c05c10 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            GRUDGE
          </span>
          <span
            className="text-[9px] font-semibold tracking-[0.35em] uppercase text-amber-500/70"
            style={{ fontFamily: 'Cinzel, serif', letterSpacing: '0.35em' }}
          >
            STUDIO
          </span>
        </div>

        {/* Right accent dot */}
        <div className="ml-auto flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 opacity-60" />
      </div>

      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-600/50 to-transparent" />
    </div>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2 19l2-10 4 4 4-8 4 8 4-4 2 10H2zm2 2h16v2H4v-2z" />
    </svg>
  );
}
