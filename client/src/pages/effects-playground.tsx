import { EngineBootstrap } from '@/components/EngineBootstrap';
export default function EffectsPlayground() {
  return (
    <EngineBootstrap
      engine="threejs"
      title="Effects Playground"
      description="Spell effects, particles, shaders, and post-processing — being rebuilt on three.js with GLSL + Three post-processing pipeline."
      concepts={['Particle Systems', 'Custom Shaders', 'Post-Processing', 'Spell VFX', 'GLSL Editor']}
    />
  );
}
