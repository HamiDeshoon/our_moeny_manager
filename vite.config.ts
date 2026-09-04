import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  return {
    base: process.env.GITHUB_ACTIONS ? '/our_moeny_manager/' : '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src/pwa',
        filename: 'service-worker.ts',
        injectRegister: false,
        manifest: false,
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,webmanifest}'],
        },
      }),
    ],
    esbuild: mode === 'production'
      ? { drop: ['debugger'], pure: ['console.log', 'console.info', 'console.debug', 'console.warn'] }
      : undefined,
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('@google/genai')) return 'vendor-genai';
            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },

  };
});
