import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, './certs/front.key')),
      cert: fs.readFileSync(path.resolve(__dirname, './certs/front.crt')),
    },
    host: true,       // si tu veux accéder depuis d'autres machines du LAN
    port: 5173,       // ou le port de ton choix
  },
})