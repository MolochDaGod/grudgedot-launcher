import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
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
        manualChunks: {
          // Split THREE.js and related libs into separate chunks (CRITICAL bundle optimization)
          'three-core': ['three'],
          'three-addons': [
            'three/examples/jsm/loaders/GLTFLoader.js',
            'three/examples/jsm/controls/OrbitControls.js'
          ],
          // Split React ecosystem
          'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
          // Split UI libraries
          'ui-vendor': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs'
          ],
          // Split query/state management
          'state-vendor': ['@tanstack/react-query', 'wouter']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
