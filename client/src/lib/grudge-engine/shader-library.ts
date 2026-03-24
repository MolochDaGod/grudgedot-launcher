/**
 * ============================================================================
 * GRUDGE ENGINE — Shader Library
 * ============================================================================
 * Ported from Online-Multiplayer-Game arena/game.js Section 4.
 *
 * Custom GLSL shaders for spell effects, environmental surfaces, and
 * the arena ground. Each shader can be instantiated as a THREE.ShaderMaterial
 * via createShaderMaterial().
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Shader Definitions
// ---------------------------------------------------------------------------

export interface ShaderDef {
  uniforms: Record<string, THREE.IUniform>;
  vertexShader: string;
  fragmentShader: string;
}

export const ShaderLibrary: Record<string, ShaderDef> = {
  /**
   * FIRE SHADER
   * Organic flames with pulsing noise and fresnel glow.
   */
  fire: {
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color(0xff4400) },
      color2: { value: new THREE.Color(0xffcc00) },
      noiseScale: { value: 2.0 },
      pulseSpeed: { value: 3.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 color1;
      uniform vec3 color2;
      uniform float noiseScale;
      uniform float pulseSpeed;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;

      float noise(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
      }

      void main() {
        float n = noise(vPosition * noiseScale + time);
        float pulse = 0.5 + 0.5 * sin(time * pulseSpeed);
        float mixFactor = n * 0.5 + 0.5 * (1.0 - length(vUv - 0.5) * 2.0);
        vec3 color = mix(color1, color2, mixFactor * pulse);
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
        color += fresnel * 0.5;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  },

  /**
   * FROST SHADER
   * Crystalline ice shimmer with cool blue glow.
   */
  frost: {
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color(0x88ccff) },
      color2: { value: new THREE.Color(0xffffff) },
      shimmerSpeed: { value: 2.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 color1;
      uniform vec3 color2;
      uniform float shimmerSpeed;
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        float shimmer = sin(vUv.x * 20.0 + time * shimmerSpeed) *
                        sin(vUv.y * 20.0 + time * shimmerSpeed * 0.7);
        shimmer = shimmer * 0.5 + 0.5;
        vec3 color = mix(color1, color2, shimmer);
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
        color += fresnel * vec3(0.5, 0.8, 1.0);
        float alpha = 0.7 + shimmer * 0.3;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  },

  /**
   * SHADOW BOLT SHADER
   * Dark energy with purple/black swirl.
   */
  shadowBolt: {
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color(0x220033) },
      color2: { value: new THREE.Color(0x8800ff) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 color1;
      uniform vec3 color2;
      varying vec2 vUv;
      varying vec3 vPosition;

      void main() {
        float angle = atan(vPosition.y, vPosition.x) + time;
        float swirl = sin(angle * 5.0 + length(vPosition.xy) * 10.0 - time * 3.0);
        swirl = swirl * 0.5 + 0.5;
        vec3 color = mix(color1, color2, swirl);
        float dist = length(vUv - 0.5) * 2.0;
        color = mix(color, color2, pow(dist, 2.0));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  },

  /**
   * HEAL SHADER
   * Golden/green holy light with rising particles.
   */
  heal: {
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color(0x44ff44) },
      color2: { value: new THREE.Color(0xffffaa) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 color1;
      uniform vec3 color2;
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        float particles = sin(vUv.y * 30.0 + time * 5.0) * sin(vUv.x * 20.0);
        particles = smoothstep(0.7, 1.0, particles);
        vec3 color = mix(color1, color2, vUv.y);
        color += particles * vec3(1.0, 1.0, 0.5);
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
        color += fresnel * color2;
        float alpha = 0.6 + particles * 0.4;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  },

  /**
   * ANIMATED SURFACE SHADER
   * Water, lava, poison pools — wave-displaced, rippling surface.
   */
  animatedSurface: {
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color(0x0044aa) },
      color2: { value: new THREE.Color(0x0088ff) },
      waveSpeed: { value: 1.0 },
      waveScale: { value: 5.0 },
    },
    vertexShader: /* glsl */ `
      uniform float time;
      uniform float waveSpeed;
      uniform float waveScale;
      varying vec2 vUv;
      varying float vWave;

      void main() {
        vUv = uv;
        float wave = sin(position.x * waveScale + time * waveSpeed) *
                     cos(position.z * waveScale + time * waveSpeed * 0.7) * 0.2;
        vWave = wave;
        vec3 pos = position;
        pos.y += wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 color1;
      uniform vec3 color2;
      varying vec2 vUv;
      varying float vWave;

      void main() {
        float ripple = sin(vUv.x * 20.0 + time) * sin(vUv.y * 20.0 + time * 0.8);
        ripple = ripple * 0.5 + 0.5;
        vec3 color = mix(color1, color2, vWave * 2.0 + 0.5 + ripple * 0.3);
        float spec = pow(ripple, 4.0) * 0.5;
        color += vec3(spec);
        gl_FragColor = vec4(color, 0.8);
      }
    `,
  },

  /**
   * ARENA GROUND SHADER
   * Subtle grid pattern with radial gradient and pulsing grid lines.
   */
  arenaGround: {
    uniforms: {
      time: { value: 0 },
      colorA: { value: new THREE.Color(0x1a1a2e) },
      colorB: { value: new THREE.Color(0x16213e) },
      gridColor: { value: new THREE.Color(0x3366ff) },
      gridOpacity: { value: 0.15 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 colorA;
      uniform vec3 colorB;
      uniform vec3 gridColor;
      uniform float gridOpacity;
      varying vec2 vUv;
      varying vec3 vPosition;

      void main() {
        float dist = length(vPosition.xz) / 30.0;
        vec3 color = mix(colorA, colorB, dist);
        float gridX = step(0.95, mod(vPosition.x, 2.0) / 2.0) +
                      step(mod(vPosition.x, 2.0) / 2.0, 0.05);
        float gridZ = step(0.95, mod(vPosition.z, 2.0) / 2.0) +
                      step(mod(vPosition.z, 2.0) / 2.0, 0.05);
        float grid = max(gridX, gridZ);
        float pulse = 0.5 + 0.5 * sin(time * 0.5);
        color = mix(color, gridColor, grid * gridOpacity * pulse);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  },
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a ShaderMaterial from the library by name.
 * Returns a fallback magenta material if the shader isn't found.
 */
export function createShaderMaterial(shaderName: string): THREE.ShaderMaterial | THREE.MeshBasicMaterial {
  const shader = ShaderLibrary[shaderName];
  if (!shader) {
    console.error(`[GrudgeEngine] Shader not found: ${shaderName}`);
    return new THREE.MeshBasicMaterial({ color: 0xff00ff });
  }

  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(shader.uniforms),
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  });
}

/** Update the `time` uniform for all active shader materials in a scene tick. */
export function updateShaderTime(material: THREE.ShaderMaterial, elapsed: number): void {
  if (material.uniforms?.time) {
    material.uniforms.time.value = elapsed;
  }
}
