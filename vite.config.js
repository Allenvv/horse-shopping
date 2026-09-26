import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * 一套代码产出三种载体：
 *   npm run build:site  官网（绝对根路径 / ，独立域名部署）
 *   npm run build:h5    H5（相对路径 ./，可放任意子目录 / CDN）
 *   npm run build:app   内嵌包（相对路径 + 隐藏自有导航壳）
 *
 * 差异通过 --mode 加载对应 .env.<mode>：
 *   VITE_TARGET   site | h5 | app    决定外壳与导航形态
 *   VITE_API_BASE API 前缀          同源部署留空；跨源填 https://api.example.com
 *   VITE_BASE     资源基础路径
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const target = env.VITE_TARGET || 'site'

  return {
    plugins: [react()],
    base: env.VITE_BASE ?? (target === 'site' ? '/' : './'),

    server: {
      port: 5173,
      host: '127.0.0.1',
      proxy: {
        // 开发期把 /api 代理到后端，前端始终同源调用
        '/api': {
          target: env.VITE_DEV_SERVER || 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
      },
    },

    build: {
      outDir: `dist-${target}`,
      assetsDir: 'assets',
      chunkSizeWarningLimit: 700,
      // 图片资源走 public 目录，这里统一加长期缓存前缀
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },

    define: {
      __BUILD_TARGET__: JSON.stringify(target),
    },
  }
})
