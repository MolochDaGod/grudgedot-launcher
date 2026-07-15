/**
 * Shared TVS CDN helpers for GrudgeDot launcher games (MOBA / Crypt Crawlers).
 */
export const TVS_CDN = "https://assets.grudge-studio.com";
export const TVS_PREFIX = `${TVS_CDN}/models/voxels/tvs`;
export const TVS_ROSTER_URL = `${TVS_PREFIX}/unit-roster.json`;

export function tvsEnv(pack: string, slug: string) {
  return `${TVS_PREFIX}/${pack}/environment/${slug}.fbx`;
}
export function tvsChar(pack: string, slug: string) {
  return `${TVS_PREFIX}/${pack}/characters/${slug}.fbx`;
}
export function tvsTex(pack: string, slug: string) {
  return `${TVS_PREFIX}/${pack}/textures/${slug}-texture.png`;
}

export const TVS_MOBA = {
  tower: {
    model: tvsEnv("voxel-knights", "voxel-knights-tower"),
    tex: tvsTex("voxel-knights", "voxel-knights-tower"),
  },
  keep: {
    model: tvsEnv("voxel-knights", "voxel-knights-keep"),
    tex: tvsTex("voxel-knights", "voxel-knights-keep"),
  },
  rangerTower: {
    model: tvsEnv("voxel-rangers", "voxel-rangers-tower"),
    tex: tvsTex("voxel-rangers", "voxel-rangers-tower"),
  },
  wizardTower: {
    model: tvsEnv("voxel-wizards", "voxel-wizards-tower"),
    tex: tvsTex("voxel-wizards", "voxel-wizards-tower"),
  },
  champion: {
    model: tvsChar("voxel-knights", "voxel-knights-champion"),
    tex: tvsTex("voxel-knights", "voxel-knights-champion"),
  },
  archer: {
    model: tvsChar("voxel-rangers", "voxel-rangers-archer"),
    tex: tvsTex("voxel-rangers", "voxel-rangers-archer"),
  },
  tent: {
    model: tvsEnv("voxel-rangers", "voxel-rangers-tent"),
    tex: tvsTex("voxel-rangers", "voxel-rangers-tent"),
  },
};

export const TVS_CRYPT = {
  cathedral: {
    model: tvsEnv("voxel-cathedral", "voxel-cathedral-cathedral"),
    tex: tvsTex("voxel-cathedral", "voxel-cathedral-cathedral"),
  },
  statue: {
    model: tvsEnv("voxel-cathedral", "voxel-cathedral-statue"),
    tex: tvsTex("voxel-cathedral", "voxel-cathedral-statue"),
  },
  grave: {
    model: tvsEnv("voxel-cathedral", "voxel-cathedral-grave"),
    tex: tvsTex("voxel-cathedral", "voxel-cathedral-grave"),
  },
  crusader: {
    model: tvsChar("voxel-cathedral", "voxel-cathedral-crusader"),
    tex: tvsTex("voxel-cathedral", "voxel-cathedral-crusader"),
  },
};

/** Load FBX + optional texture, normalize height in meters. */
export async function loadTvsFbx(
  THREE: typeof import("three"),
  FBXLoader: new () => { load: Function },
  modelUrl: string,
  textureUrl?: string,
  targetHeight = 2,
): Promise<import("three").Group> {
  const loader = new FBXLoader();
  const root: import("three").Group = await new Promise((resolve, reject) => {
    loader.load(modelUrl, resolve, undefined, reject);
  });

  if (textureUrl) {
    try {
      const tex: import("three").Texture = await new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(textureUrl, resolve, undefined, reject);
      });
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      root.traverse((ch: any) => {
        if (!ch.isMesh) return;
        const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
        for (let i = 0; i < mats.length; i++) {
          const m = mats[i].clone();
          m.map = tex;
          m.needsUpdate = true;
          if (m.color) m.color.setHex(0xffffff);
          mats[i] = m;
        }
        ch.material = Array.isArray(ch.material) ? mats : mats[0];
        ch.castShadow = true;
        ch.receiveShadow = true;
      });
    } catch {
      /* texture optional */
    }
  }

  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y > 0.001) {
    const s = targetHeight / size.y;
    root.scale.setScalar(s);
    root.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(root);
    root.position.y -= box2.min.y;
  }
  return root;
}
