import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default {
  base: '/follow-scope/',
  plugins: [react(), tailwindcss()],
}