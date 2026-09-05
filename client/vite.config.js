import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server config.
//
// The `proxy` entry is the important part. During development the React app is
// served by Vite on http://localhost:5173, but the API lives on
// http://localhost:3000. Without the proxy the browser would be making a
// cross-origin request and the session-cookie handling would get complicated.
//
// With the proxy the browser only ever talks to localhost:5173. Any request
// whose path starts with /api is forwarded by Vite to localhost:3000 behind the
// scenes. From the browser's point of view everything is same-origin — exactly
// how it will work in production, where nginx forwards /api to the Node server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist', // `npm run build` writes static files here; nginx serves them
  },
});
