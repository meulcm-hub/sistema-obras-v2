import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/sistema-obras-v2/' : '/',
  plugins: [react()],
  server: { host: '0.0.0.0' },
}))
