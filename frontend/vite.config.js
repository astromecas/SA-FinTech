import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O proxy evita CORS em desenvolvimento: /api -> backend (porta 3001)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
});
