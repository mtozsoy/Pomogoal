import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' : site herhangi bir alt klasörde (ör. GitHub Pages) sorunsuz çalışsın
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 }
})
