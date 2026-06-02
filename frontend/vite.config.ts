import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5174,
    strictPort: true,
    host: '0.0.0.0',  // allow access from network (server deployment)
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3101',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5174,
    strictPort: true,
    host: '0.0.0.0',
  },
}));
