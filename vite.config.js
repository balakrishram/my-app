import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward API calls to the local Express + SQLite server (server/index.js)
      '/api': 'http://localhost:5174',
    },
  },
})
