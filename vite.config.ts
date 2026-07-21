import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths so the production build works at any mount point,
  // e.g. a GitHub Pages project site at https://<user>.github.io/<repo>/.
  // Routing is hash-based, so no base subpath or server rewrite is needed.
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    // Force the local (offline) store during tests regardless of any .env
    // Supabase creds, so the suite never reads from or writes to a real backend.
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
});
