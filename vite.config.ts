import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' : site herhangi bir alt klasörde (ör. GitHub Pages) sorunsuz çalışsın
export default defineConfig({
  base: './',
  plugins: [react()],
  // /api/ istekleri `npm run dev:worker` ile çalışan yerel Worker'a gider
  server: { port: 5173, proxy: { '/api': 'http://localhost:8787' } }
})
