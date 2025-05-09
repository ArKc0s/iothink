import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

const keyPath = '/app/certs/front.key'
const certPath = '/app/certs/front.crt'

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    },
    host: true,
    port: 5173,
  },
})
