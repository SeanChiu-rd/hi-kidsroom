import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 讓區域網路（手機同 Wi-Fi）與通道服務能連入
    allowedHosts: true, // 允許外部網域（如 cloudflared 通道）連入，僅供測試用
  },
})
