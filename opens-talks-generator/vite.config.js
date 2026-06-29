import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// O front (Vite) roda na 5173 e faz proxy de /api para o servidor Express (8787),
// que é quem guarda a ANTHROPIC_API_KEY. A chave NUNCA chega ao browser.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
