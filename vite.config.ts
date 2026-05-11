import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site at /<repo-name>/ — this prefix keeps all
  // asset paths correct both locally (npm run dev) and in production.
  base: '/stock-exchange-experiment/',
})
