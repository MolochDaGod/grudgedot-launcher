/**
 * WcsRedirect — bounces the user to the canonical Warlord-Crafting-Suite page
 * for Character Creation / Arsenal / /home, with ?return=<our-origin>/<returnPath>
 * so WCS can bounce back here with ?character_id=<id> when finished.
 *
 * Mirror of the component in GrudgeBuilder — keep them in sync.
 */
import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

const WCS_ORIGIN =
  (import.meta as any).env?.VITE_WCS_URL ||
  'https://warlord-crafting-suite.vercel.app';

interface WcsRedirectProps {
  to: string;
  returnPath?: string;
  label?: string;
  autoDelayMs?: number;
}

export default function WcsRedirect({
  to,
  returnPath,
  label = 'Continue',
  autoDelayMs = 600,
}: WcsRedirectProps) {
  const targetUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const retAbs = new URL(returnPath || window.location.pathname || '/home', window.location.origin);
    const target = new URL(to.startsWith('/') ? to : `/${to}`, WCS_ORIGIN);
    target.searchParams.set('return', retAbs.toString());
    return target.toString();
  }, [to, returnPath]);

  useEffect(() => {
    if (!targetUrl || autoDelayMs < 0) return;
    const t = setTimeout(() => { window.location.href = targetUrl; }, autoDelayMs);
    return () => clearTimeout(t);
  }, [targetUrl, autoDelayMs]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 p-6">
      <div className="max-w-md w-full bg-stone-900/95 border-2 border-amber-800/40 rounded-xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin" />
        <h1 className="text-2xl font-bold text-amber-400 font-cinzel mb-2 tracking-wide">
          Opening Warlord Crafting Suite
        </h1>
        <p className="text-stone-400 text-sm mb-6">
          Taking you to the canonical {to.replace(/^\//, '')} flow&hellip;
        </p>
        <Button
          size="lg"
          onClick={() => { if (targetUrl) window.location.href = targetUrl; }}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold hover:from-amber-400 hover:to-amber-500"
        >
          <ExternalLink className="w-4 h-4 mr-2" /> {label}
        </Button>
        <p className="text-xs text-stone-500 mt-4">
          WCS will return you here when you finish.
        </p>
      </div>
    </div>
  );
}
