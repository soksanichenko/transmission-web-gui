import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/transmission-ui/',
  server: {
    proxy: {
      '/transmission/rpc': {
        target: 'http://localhost:9091',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
