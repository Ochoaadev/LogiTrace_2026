import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// "npm run dev:movil" sirve la app por HTTPS en la red local: los navegadores solo permiten el
// GPS (navigator.geolocation) en HTTPS o en localhost, y el repartidor la abre desde su teléfono.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), mode === 'movil' && basicSsl({ name: 'logitrace-local' })].filter(Boolean),
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
}))
