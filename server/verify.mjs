/**
 * 端到端冒烟测试：登录态令牌 → 加购 → 下单 → 拉起支付 → 模拟回调 → 校验改单/扣库存
 *
 * 用法：node server/verify.mjs
 * 前置：后端已启动（默认 8787）
 */
import { db, DB_PATH } from './db.js'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8787'
const TOKEN = `verify-${Date.now().toString(36)}`

let failed = 0
const step = async (name, fn) => {
  try {
    const out = await fn()
    console.log(`✓ ${name}`)
    return out
  } catch (err) {
    failed += 1
    console.error(`✗ ${name}\n   ${err.message}`)
    throw err
  }
}

const api = async (method, path, body) => {
  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-cart-token': TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await resp.json()
  if (json.code !== 0) {
    throw new Error(`${method} ${path} -> ${resp.status} ${json.code} ${json.message}`)
  }
  return json.data
}

const expect = (cond, msg) => {
  if (!cond) throw new Error(`断言失败：${msg}`)
}

/* ------------------------------------------------------------------ */
try {
  console.log(`\n▶ 端到端验证（BASE=${BASE}，token=${TOKEN}）\n`)

  // 1. 元数据
  const categories = await step('读取品类列表', () => api('GET', '/api/v1/meta/categories'))
  expect(categories.length === 8, '应有 8 个品类')

  const flash = await step('读取秒杀场次', () => api('GET', '/api/v1/meta/flash-sale'))
  expect(flash.items.length === 3, '秒杀应有 3 个商品')
  const flashItem = flash.items[0]
  expect(
    flashItem.claimedPercent === Math.round((flashItem.sold / flashItem.totalStock) * 100),
    '秒杀进度应由库存与销量推导'
  )

  // 2. 商品列表 + 详情
  const list = await step('按品类筛选商品', () =>
    api('GET', '/api/v1/products?category=outerwear&sort=price_asc')
  )
  expect(list.list.length > 0, '外套品类应有商品')
  expect(
    list.list.every((p, i, a) => i === 0 || a[i - 1].price <= p.price),
    '价格升序排列'
  )

  const detail = await step('读取商品详情', () => api('GET', `/api/v1/products/${list.list[0].id}`))
  expect(detail.colors.length > 0, '应有可选颜色')
  const sizeWithStock = detail.colors.flatMap((c) => c.sizes).find((s) => s.stock > 0)
  expect(sizeWithStock, '应有在售 SKU')
  expect(detail.sizeChart.length > 0, '应有尺码表')

  // 3. 评价
  const reviews = await step('读取商品评价', () =>
    api('GET', `/api/v1/products/${detail.id}/reviews`)
  )
  expect(reviews.list.length > 0, '应有评价')

  // 4. 加购
  let cart = await step('加入购物车', () =>
    api('POST', '/api/v1/cart/items', { skuId: sizeWithStock.skuId, qty: 2 })
  )
  expect(cart.items.length === 1, '购物车应有 1 条')
  expect(cart.goodsAmount === cart.items[0].subtotal, '小计 = 单价 × 数量')

  const skuStockBefore = (
    await api('GET', `/api/v1/products/${detail.id}`)
  ).colors.flatMap((c) => c.sizes).find((s) => s.skuId === sizeWithStock.skuId).stock

  // 5. 库存不足应被拒绝（用独立令牌，不污染主购物车）
  await step('超量加购被拒绝（409 OUT_OF_STOCK）', async () => {
    const skus = detail.colors.flatMap((c) => c.sizes).filter((s) => s.stock >= 1 && s.stock <= 98)
    const target = skus[0] || sizeWithStock
    const resp = await fetch(`${BASE}/api/v1/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cart-token': `${TOKEN}-neg`,
      },
      body: JSON.stringify({ skuId: target.skuId, qty: Math.min(99, target.stock + 1) }),
    })
    const j = await resp.json()
    if (j.code !== 40901) throw new Error(`期望 40901，实际 ${j.code} ${j.message}`)
    return null
  })

  // 6. 优惠券
  const coupons = await step('读取优惠券列表', () => api('GET', '/api/v1/meta/coupons'))
  const newuser = coupons.find((c) => c.scope === 'newuser')
  const claimed = await step('领取新客券', () => api('POST', `/api/v1/coupons/${newuser.code}/claim`))
  expect(claimed.code === newuser.code, '领取返回券码')
  await step('重复领取被拒绝（409）', async () => {
    const resp = await fetch(`${BASE}/api/v1/coupons/${newuser.code}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cart-token': TOKEN },
    })
    const j = await resp.json()
    if (resp.status !== 409) throw new Error(`期望 409，实际 ${resp.status}`)
    return null
  })

  // 7. 下单（使用新客券）
  const order = await step('创建订单（应用新客券）', () =>
    api('POST', '/api/v1/orders', {
      fromCart: true,
      receiver: '张三',
      phone: '13800138000',
      address: '上海市徐汇区漕河泾开发区宜山路 900 号 A 座 12 层',
      remark: '工作日白天送货',
      couponCode: newuser.code,
    })
  )
  expect(order.status === 'pending_payment', '新订单状态为待支付')
  expect(order.discount === newuser.amount, `优惠金额应为 ${newuser.amount}`)
  expect(order.freight === 0, '满 599 应免运费')
  expect(
    order.payable === order.goodsAmount + order.freight - order.discount,
    '应付 = 商品 + 运费 - 优惠'
  )

  // 8. 微信支付
  const pay = await step('创建微信支付单（Native 扫码）', () =>
    api('POST', '/api/v1/payments', { orderNo: order.orderNo, channel: 'wechat' })
  )
  expect(pay.payment.qrDataUrl?.startsWith('data:image/png;base64,'), '应返回二维码图片')
  expect(pay.payment.amount === order.payable, '支付金额与订单应付一致')
  expect(pay.payment.sandbox === true, '未配置商户凭证时应为沙箱模式')

  // 9. 状态轮询（未支付）
  const before = await step('轮询支付状态（待支付）', () =>
    api('GET', `/api/v1/payments/${pay.payment.paymentNo}/status`)
  )
  expect(before.status === 'created' && before.orderStatus === 'pending_payment', '应为待支付')

  // 10. 模拟渠道回调（与真实回调同一条落账路径）
  const settled = await step('沙箱回调：支付成功落账', () =>
    api('POST', `/api/v1/payments/dev/${pay.payment.paymentNo}/simulate-success`)
  )
  expect(settled.status === 'success' && settled.orderStatus === 'paid', '支付单与订单均应变为已支付')

  // 11. 落账副作用
  const after = await step('校验扣库存与销量', () => api('GET', `/api/v1/products/${detail.id}`))
  const skuStockAfter = after.colors
    .flatMap((c) => c.sizes)
    .find((s) => s.skuId === sizeWithStock.skuId).stock
  expect(skuStockAfter === skuStockBefore - 2, `库存应减少 2（${skuStockBefore} → ${skuStockAfter}）`)
  expect(after.sales === detail.sales + 2, '销量应 +2')

  // 12. 幂等：重复回调不重复扣
  await step('重复回调幂等（不重复扣库存）', async () => {
    const resp = await fetch(
      `${BASE}/api/v1/payments/dev/${pay.payment.paymentNo}/simulate-success`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cart-token': TOKEN } }
    )
    const j = await resp.json()
    const again = await api('GET', `/api/v1/products/${detail.id}`)
    const stock = again.colors.flatMap((c) => c.sizes).find((s) => s.skuId === sizeWithStock.skuId).stock
    if (stock !== skuStockAfter) throw new Error(`库存被重复扣减：${stock}`)
    return null
  })

  // 13. 购物车已清空
  const emptyCart = await step('下单后购物车对应条目被清空', () => api('GET', '/api/v1/cart'))
  expect(emptyCart.items.length === 0, '购物车应为空')

  console.log(`\n✅ 全部 ${13} 项检查通过\n`)
} catch (err) {
  console.error(`\n❌ 验证中断：${err.message}\n`)
  failed += 1
} finally {
  process.exit(failed > 0 ? 1 : 0)
}
