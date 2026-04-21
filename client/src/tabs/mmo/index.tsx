import { EngineBootstrap } from '@/components/EngineBootstrap';
export default function MMOTab() {
  return (
    <EngineBootstrap
      engine="threejs"
      title="MMO World"
      description="Top-down MMO with terrain layers, player entities, and combat — being rebuilt on three.js (primary stack). Babylon experiments live in BabyGrudge."
      concepts={['Terrain Layers', 'Entity System', 'Combat', 'Multiplayer Sync', 'Class System']}
    />
  );
}
