/**
 * 潮野 CHAOYE 商城后端
 *
 * 启动：node server/index.js          （或 npm run server）
 * 端口：默认 8787，可用 PORT 覆盖
 *
 * 生产部署：同时托管 dist/ 静态资源，前端与 API 同源，无需额外 CORS 配置。
 */
import express from 'express'
import cors from 'cors'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

import metaRoutes from './routes/meta.js'
import productRoutes from './routes/products.js'
import cartRoutes from './routes/cart.js'
import orderRoutes from './routes/orders.js'
import paymentRoutes from './routes/payments.js'
import couponRoutes from './routes/coupons.js'
import addressRoutes from './routes/addresses.js'
import { ok, ApiError, CODE } from './util.js'
import { initSchema } from './db.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const app = express()
const PORT = Number(process.env.PORT || 8787)

// 幂等建表：已存在的表不受影响，缺失的表（如升级后新增）会被补齐
initSchema()

app.disable('x-powered-by')
app.set('trust proxy', 1)

/* ------------------------------------------------------------- 全局中间件 */
// 跨域：开发期前端在 5173，生产同源。允许列表收紧到本地端口。
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true) // curl / 内嵌 WebView
      const allow = [/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/]
      cb(null, allow.some((re) => re.test(origin)))
    },
    credentials: true,
  })
)

// 请求体：支付回调是 JSON 或 form，两种都要能解析
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// 请求 id + 耗时日志（便于排查慢接口）
app.use((req, res, next) => {
  res.locals.requestId = randomUUID().slice(0, 8)
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    if (ms > 300 || res.statusCode >= 500) {
      console.warn(`[slow] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`)
    }
  })
  next()
})

/* ------------------------------------------------------------------ 路由 */
app.get('/api/health', (req, res) =>
  ok(res, { status: 'up', uptime: Math.round(process.uptime()), node: process.version })
)

app.use('/api/v1/meta', metaRoutes)
app.use('/api/v1/products', productRoutes)
app.use('/api/v1/cart', cartRoutes)
app.use('/api/v1/orders', orderRoutes)
app.use('/api/v1/coupons', couponRoutes)
app.use('/api/v1/addresses', addressRoutes)
app.use('/api/v1/payments', paymentRoutes) // 含 /pay/notify/:channel 回调

/* --------------------------------------------------------- 生产静态资源 */
// 多端产物分目录：dist-site（官网）/ dist-h5 / dist-app，默认托管官网
// 可用 STATIC_DIR 指定，设为 'none' 则只跑 API（前后端分离部署）
const DIST = join(ROOT, process.env.STATIC_DIR || 'dist-site')
if (process.env.STATIC_DIR !== 'none' && existsSync(DIST)) {
  console.log(`  静态资源：${DIST}`)
  app.use(express.static(DIST, { maxAge: '1h', index: false }))
  // 前端路由兜底：非 API 路径一律回 index.html
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(join(DIST, 'index.html')))
}

/* ------------------------------------------------------------ 404 / 错误 */
app.use((req, res) => {
  res.status(404).json({ code: CODE.NOT_FOUND, message: `接口不存在：${req.method} ${req.path}` })
})

// 统一错误处理：ApiError 走业务码，其余按 500
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      code: err.code,
      message: err.message,
      detail: err.detail,
      requestId: res.locals.requestId,
    })
  }
  // body-parser 的 JSON 语法错误
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: CODE.BAD_REQUEST, message: '请求体不是合法 JSON' })
  }
  console.error('[unhandled]', err)
  res.status(500).json({ code: CODE.INTERNAL, message: '服务内部错误', requestId: res.locals.requestId })
})

app.listen(PORT, () => {
  const wechatReady = Boolean(
    process.env.WECHAT_PAY_MCHID && process.env.WECHAT_PAY_PRIVATE_KEY
  )
  const alipayReady = Boolean(process.env.ALIPAY_APP_ID && process.env.ALIPAY_PRIVATE_KEY)
  console.log(`✓ 潮野商城后端已启动  http://127.0.0.1:${PORT}`)
  console.log(`  微信支付：${wechatReady ? '真实模式（API v3）' : '沙箱模式（未配置商户凭证）'}`)
  console.log(`  支付宝  ：${alipayReady ? '真实模式（当面付）' : '沙箱模式（未配置商户凭证）'}`)
})
