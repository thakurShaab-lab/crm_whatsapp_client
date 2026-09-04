import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://52.76.199.149/crm-whatsapp',
      '/media': 'http://52.76.199.149/crm-whatsapp',
      '/socket.io': { target: 'http://52.76.199.149/crm-whatsapp', ws: true },
    },
  },
})