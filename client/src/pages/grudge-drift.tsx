import { EngineBootstrap } from '@/components/EngineBootstrap';
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';
export default function GrudgeDrift() {
  return (
    <GrudgeGameWrapper gameSlug="grudge-drift" gameName="Grudge Drift" xpPerThousand={10} goldPerGame={8}>
      {(session) => <GrudgeDriftInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function GrudgeDriftInner({ session }: { session: GrudgeGameSession }) {
  return (
    <EngineBootstrap
      engine="threejs"
      title="Grudge Drift"
      description="3D racing with drift mechanics — being rebuilt on three.js + @react-three/fiber (Rapier physics)."
      concepts={['Drift Physics', 'Vehicle Models', 'Track Design', 'Boost System']}
    />
  );
}
