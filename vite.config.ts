import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import viteCompression from "vite-plugin-compression";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    // Gzip all assets > 1kB for faster CDN delivery
    viteCompression({ algorithm: "gzip", ext: ".gz", threshold: 1024 }),
    // Brotli for modern clients
    viteCompression({ algorithm: "brotliCompress", ext: ".br", threshold: 1024 }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        /**
         * Function-based manualChunks — more reliable than the object form.
         * Splits every heavy library into its own cacheable chunk so a code
         * change in one page never invalidates unrelated engine caches.
         */
        manualChunks(id: string) {
          // ── Game engines (heaviest — always isolate) ────────────
          if (id.includes("/phaser/")) return "phaser-engine";
          if (id.includes("/@babylonjs/")) return "babylon-engine";
          if (id.includes("/pixi.js/") || id.includes("/pixi/"))
            return "pixi-engine";
          if (id.includes("/playcanvas/")) return "playcanvas-engine";
          if (id.includes("/kaplay/")) return "kaplay-engine";
          if (id.includes("/cannon-es/") || id.includes("/matter-js/"))
            return "physics-engine";

          // ── Three.js family ─────────────────────────────────────
          if (
            id.includes("/node_modules/three/") &&
            !id.includes("/examples/jsm")
          )
            return "three-core";
          if (
            id.includes("/node_modules/three/examples/jsm") ||
            id.includes("/@react-three/") ||
            id.includes("/troika-three") ||
            id.includes("/three-mesh-bvh") ||
            id.includes("/postprocessing/")
          )
            return "three-addons";

          // ── React ecosystem ─────────────────────────────────────
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/")
          )
            return "react-vendor";

          // ── UI component library ────────────────────────────────
          if (id.includes("/@radix-ui/")) return "ui-vendor";
          if (id.includes("/framer-motion/")) return "framer-vendor";
          if (
            id.includes("/recharts/") ||
            /\/d3-[a-z]/.test(id) ||
            id.includes("/d3/")
          )
            return "charts-vendor";

          // ── State/routing ────────────────────────────────────────
          if (
            id.includes("/@tanstack/react-query") ||
            id.includes("/wouter/")
          )
            return "state-vendor";

          // ── Networking ───────────────────────────────────────────
          if (
            id.includes("/socket.io-client/") ||
            id.includes("/engine.io-client/")
          )
            return "socket-vendor";

          // ── Shared game data (hero roster, WCS) ──────────────────
          // Keep these separate so editing game logic doesn't bust engine cache
          if (
            id.includes("/shared/") &&
            (id.includes("grudaWarsHeroes") ||
             id.includes("grudachain") ||
             id.includes("gameDefinitions") ||
             id.includes("wcs"))
          )
            return "game-data";
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
