import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Les pages sont chargées en lazy (cf. src/Routes.jsx) : l'entrée ne doit
    // porter que le socle. Le budget (≤ 200 ko gzip) est vérifié par size-limit.
    rollupOptions: {
      output: {
        // Les chunks de route sont nommés `chunk-*` pour ne pas être confondus
        // avec l'entrée `index-*` (que size-limit mesure).
        chunkFileNames: 'assets/chunk-[name]-[hash].js',
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Graphes isolés dans un chunk « charts » (chargé uniquement avec le
          // tableau de bord) et mesurés par une entrée size-limit dédiée.
          if (/recharts|(^|\/)d3-|node_modules\/d3\//.test(id)) return 'charts';
          if (/@tanstack/.test(id)) return 'vendor-query';
          // React et son écosystème dans le MÊME chunk que le reste du vendor :
          // react (CJS) requiert des helpers d'interop Rollup au top-level de
          // son chunk ; si `vendor-react` était séparé, le helper pouvait être
          // hébergé dans `vendor` (qui importe React) → cycle
          // d'initialisation inter-chunks (crash « Cannot read properties of
          // undefined (reading 'forwardRef') » en prod). Un seul chunk vendor
          // = zéro arête intra-vendor. Seul `charts` reste isolé (budget
          // size-limit dédié, chargé avec le tableau de bord uniquement).
          return 'vendor';
        },
      },
    },
  },
})
