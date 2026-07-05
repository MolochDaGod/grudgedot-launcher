import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';

const SwarmRTSEnhanced = lazy(() => import('./swarm-rts-enhanced'));

export default function GrudgeSwarmPage() {
  return (
    <GrudgeGameWrapper gameSlug="grudge-swarm" gameName="Grudge Swarm" xpPerThousand={12} goldPerGame={8} hideHud>
      {() => (
        <Suspense
          fallback={
            <div className="flex h-full min-h-[320px] items-center justify-center bg-black">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            </div>
          }
        >
          <SwarmRTSEnhanced />
        </Suspense>
      )}
    </GrudgeGameWrapper>
  );
}
