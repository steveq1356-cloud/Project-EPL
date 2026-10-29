import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = `http://127.0.0.1:${process.env.PORT || 3001}`;

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', // localhost only
    port: 5173,
    proxy: {
      '/api': API,
      '/uploads': API,
    },
  },
});
