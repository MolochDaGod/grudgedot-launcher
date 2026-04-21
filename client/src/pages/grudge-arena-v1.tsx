import { EngineBootstrap } from '@/components/EngineBootstrap';
export default function GrudgeArenaV1() {
  return (
    <EngineBootstrap
      engine="threejs"
      title="Grudge Arena V1"
      description="First iteration of the combat arena — being rebuilt on three.js. Babylon V2 prototype is available from BabyGrudge."
      concepts={['Combat System', 'Character Models', 'Particle Effects']}
    />
  );
}
