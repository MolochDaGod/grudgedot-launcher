import { EngineBootstrap } from '@/components/EngineBootstrap';
export default function MapEditor() {
  return (
    <EngineBootstrap
      engine="threejs"
      title="Map Editor"
      description="2D/3D map editor with terrain, sectors, entity placement, and play mode — being rebuilt on three.js."
      concepts={['Terrain Editor', 'Entity Placement', 'Sector System', 'Play Mode', 'GLTF Import', 'Lighting Controls']}
    />
  );
}
