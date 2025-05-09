import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync('/app/certs/front.key'),
      cert: fs.readFileSync('/app/certs/front.crt'),
    },
    host: true,       // si tu veux accéder depuis d'autres machines du LAN
    port: 5173,       // ou le port de ton choix
  },
})