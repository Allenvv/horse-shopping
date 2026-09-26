/** 购物车（服务端存储，匿名令牌隔离，后续可平滑换成登录态） */
import { Router } from 'express'
import { db, tx, now } from '../db.js'
import { config } from '../config.js'
import { ok, wrap, getToken, assert, badRequest, notFound, ApiError, CODE } from '../util.js'

const router = Router()

/** 取或创建购物车 */
function ensureCart(token) {
  db.prepare('INSERT OR IGNORE INTO carts (id, created_at) VALUES (?, ?)').run(token, now())
  return token
}

/** 计算购物车视图：金额、件数、运费预览、库存告警 */
function cartView(token) {
  const rows = db
    .prepare(
      `SELECT ci.id AS cartItemId, ci.qty, ci.sku_id,
              s.id AS skuId, s.color_name, s.color_hex, s.size, s.stock AS skuStock,
              s.price_diff, s.product_id,
              p.title, p.image, p.price, p.origin_price, p.status AS productStatus, p.spu_code
       FROM cart_items ci
       JOIN product_skus s ON s.id = ci.sku_id
       JOIN products p ON p.id = s.product_id
       WHERE ci.cart_id = ? ORDER BY ci.added_at DESC`
    )
    .all(token)

  const items = rows.map((r) => {
    const unit = r.price + r.price_diff
    return {
      cartItemId: r.cartItemId,
      skuId: r.skuId,
      productId: r.product_id,
      spuCode: r.spu_code,
      title: r.title,
      image: r.image,
      color: { name: r.color_name, hex: r.color_hex },
      size: r.size,
      qty: r.qty,
      unitPrice: unit,
      subtotal: unit * r.qty,
      maxQty: r.skuStock,
      // 库存告警：下单前就能看到，而不是等提交订单才报错
      stockWarning: r.skuStock <= 0 ? 'out' : r.qty > r.skuStock ? 'exceed' : null,
      available: r.productStatus === 'on' && r.skuStock > 0,
    }
  })

  const valid = items.filter((i) => i.available && !i.stockWarning)
  const goodsAmount = valid.reduce((s, i) => s + i.subtotal, 0)
  const count = items.reduce((s, i) => s + i.qty, 0)
  const freight = goodsAmount === 0 || goodsAmount >= config.freightFreeThreshold ? 0 : config.freightFlat

  return {
    token,
    items,
    count,
    goodsAmount,
    freightPreview: freight,
    freeShippingThreshold: config.freightFreeThreshold,
    freeShippingGap: Math.max(0, config.freightFreeThreshold - goodsAmount),
    hasIssue: items.some((i) => !i.available || i.stockWarning),
  }
}

/** 校验该购物车条目归属 */
function getOwnItem(token, cartItemId) {
  const row = db
    .prepare(
      `SELECT ci.*, s.stock, p.status FROM cart_items ci
       JOIN product_skus s ON s.id = ci.sku_id
       JOIN products p ON p.id = s.product_id
       WHERE ci.id = ? AND ci.cart_id = ?`
    )
    .get(cartItemId, token)
  if (!row) throw notFound('购物车条目不存在')
  return row
}

/* ------------------------------------------------------------ 查看购物车 */
router.get(
  '/',
  wrap(async (req, res) => {
    const token = getToken(req)
    ensureCart(token)
    ok(res, cartView(token))
  })
)

/* ------------------------------------------------------------ 加入购物车 */
router.post(
  '/items',
  wrap(async (req, res) => {
    const token = ensureCart(getToken(req))
    const skuId = Number(req.body?.skuId)
    const qty = Number(req.body?.qty ?? 1)
    assert(Number.isInteger(skuId) && skuId > 0, 'skuId 非法')
    assert(Number.isInteger(qty) && qty >= 1 && qty <= 99, '数量需在 1-99 之间')

    const sku = db
      .prepare(
        `SELECT s.*, p.status FROM product_skus s JOIN products p ON p.id = s.product_id WHERE s.id = ?`
      )
      .get(skuId)
    if (!sku) throw notFound('SKU 不存在')
    if (sku.status !== 'on') throw new ApiError(CODE.CONFLICT, '商品已下架', 409)
    if (sku.stock <= 0) throw new ApiError(CODE.OUT_OF_STOCK, '该款式已售罄', 409)

    tx(() => {
      const exist = db
        .prepare('SELECT * FROM cart_items WHERE cart_id = ? AND sku_id = ?')
        .get(token, skuId)
      const current = exist ? exist.qty : 0
      const requested = current + qty
      // 显式报错而不是静默截断，让用户知道实际可买多少
      if (requested > sku.stock) {
        throw new ApiError(
          CODE.OUT_OF_STOCK,
          sku.stock === 0 ? '该款式已售罄' : `库存不足：该款式仅剩 ${sku.stock} 件`,
          409
        )
      }
      if (exist) {
        db.prepare('UPDATE cart_items SET qty = ? WHERE id = ?').run(requested, exist.id)
      } else {
        db.prepare('INSERT INTO cart_items (cart_id, sku_id, qty, added_at) VALUES (?,?,?,?)').run(
          token,
          skuId,
          qty,
          now()
        )
      }
    })

    ok(res, cartView(token), { message: '已加入购物车' })
  })
)

/* ------------------------------------------------------------ 修改数量 */
router.patch(
  '/items/:id',
  wrap(async (req, res) => {
    const token = getToken(req)
    const id = Number(req.params.id)
    const qty = Number(req.body?.qty)
    assert(Number.isInteger(id) && id > 0, '条目 id 非法')
    assert(Number.isInteger(qty) && qty >= 0 && qty <= 99, '数量需在 0-99 之间')

    const item = getOwnItem(token, id)
    if (qty === 0) {
      db.prepare('DELETE FROM cart_items WHERE id = ?').run(id)
    } else {
      if (qty > item.stock) {
        throw new ApiError(
          CODE.OUT_OF_STOCK,
          `库存不足：该款式仅剩 ${item.stock} 件`,
          409
        )
      }
      db.prepare('UPDATE cart_items SET qty = ? WHERE id = ?').run(qty, id)
    }
    ok(res, cartView(token))
  })
)

/* ------------------------------------------------------------ 移除 */
router.delete(
  '/items/:id',
  wrap(async (req, res) => {
    const token = getToken(req)
    const id = Number(req.params.id)
    assert(Number.isInteger(id) && id > 0, '条目 id 非法')
    getOwnItem(token, id)
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(id)
    ok(res, cartView(token), { message: '已移除' })
  })
)

export { ensureCart, cartView }
export default router
