import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 的網址是 https://<帳號>.github.io/anonymous-chat/，
// 網站在子路徑底下，所以 base 一定要寫 '/anonymous-chat/'，否則上線後會一片空白。
export default defineConfig({
  base: '/anonymous-chat/',
  plugins: [react()],
})
