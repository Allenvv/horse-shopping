/** 订单：创建 / 查询 / 取消 */
import { Router } from 'express'
import { db, tx, now, bizNo } from '../db.js'
import { config, canTransition } from '../config.js'
import {
  ok,
  wrap,
  getToken,
  assert,
  requireFields,
  isPhone,
  notFound,
  badRequest,
  ApiError,
  CODE,
} from '../util.js'
import { cartView } from './cart.js'

const router = Router()

/* -------------------------------------------------- 优惠券可用性校验 */
function validateCoupon(coupon, { goodsAmount, items, token }) {
  if (!coupon) throw new ApiError(CODE.COUPON_INVALID, '优惠券不存在', 409)
  if (coupon.issued >= coupon.total) throw new ApiError(CODE.COUPON_INVALID, '优惠券已领完', 409)

  const mine = db
    .prepare("SELECT * FROM user_coupons WHERE token = ? AND coupon_id = ? AND status = 'unused'")
    .get(token, coupon.id)
  if (!mine) throw new ApiError(CODE.COUPON_INVALID, '请先领取该优惠券', 409)

  if (goodsAmount < coupon.threshold) {
    throw new ApiError(
      CODE.COUPON_INVALID,
      `未达到使用门槛：满 ¥${(coupon.threshold / 100).toFixed(0)} 可用`,
      409
    )
  }

  if (coupon.scope.startsWith('category:')) {
    const slug = coupon.scope.slice('category:'.length)
    const allInCategory = items.every(
      (i) => db.prepare('SELECT slug FROM categories WHERE id = ?').get(i.categoryId)?.slug === slug
    )
    if (!allInCategory) {
      throw new ApiError(CODE.COUPON_INVALID, '该券仅限指定品类使用', 409)
    }
  }
  if (coupon.scope === 'newuser') {
    const paidOrders = db
      .prepare("SELECT COUNT(*) AS c FROM orders WHERE cart_token = ? AND status != 'cancelled'")
      .get(token).c
    if (paidOrders > 0) throw new ApiError(CODE.COUPON_INVALID, '新客券仅限首单使用', 409)
  }
  return coupon
}

/* -------------------------------------------------- 待结算信息（结算页预览） */
router.get(
  '/preview',
  wrap(async (req, res) => {
    const token = getToken(req)
    const view = cartView(token)
    const payableItems = view.items.filter((i) => i.available && !i.stockWarning)

    const couponList = db
      .prepare(
        `SELECT c.*, uc.status AS hold_status FROM user_coupons uc
         JOIN coupons c ON c.id = uc.coupon_id
         WHERE uc.token = ? AND uc.status = 'unused'`
      )
      .all(token)
      .filter((c) => {
        if (c.scope === 'all') return view.goodsAmount >= c.threshold
        return true
      })

    ok(res, {
      items: payableItems,
      goodsAmount: view.goodsAmount,
      freight: payableItems.length === 0
        ? 0
        : view.goodsAmount >= config.freightFreeThreshold ? 0 : config.freightFlat,
      freeShippingThreshold: config.freightFreeThreshold,
      availableCoupons: couponList.map((c) => ({
        code: c.code,
        title: c.title,
        amount: c.amount,
        threshold: c.threshold,
        scope: c.scope,
      })),
      blockedItems: view.items.filter((i) => !i.available || i.stockWarning),
    })
  })
)

/* -------------------------------------------------- 创建订单 */
router.post(
  '/',
  wrap(async (req, res) => {
    const token = getToken(req)
    requireFields(req.body || {}, ['receiver', 'phone', 'address'])

    const { receiver, phone, address, remark, couponCode, fromCart } = req.body
    assert(receiver.trim().length >= 2 && receiver.trim().length <= 30, '收货人姓名需 2-30 字')
    assert(isPhone(phone), '手机号格式不正确')
    assert(address.trim().length >= 8, '收货地址过短')
    assert(!remark || remark.length <= 100, '备注最长 100 字')

    // 1. 确定下单明细（整体结算 或 立即购买）
    let lines
    if (fromCart) {
      const view = cartView(token)
      lines = view.items
        .filter((i) => i.available && !i.stockWarning)
        .map((i) => ({ skuId: i.skuId, qty: i.qty, cartItemId: i.cartItemId }))
      if (!lines.length) throw badRequest('购物车中没有可结算的商品')
    } else {
      const arr = Array.isArray(req.body?.items) ? req.body.items : []
      assert(arr.length > 0, '缺少下单商品')
      lines = arr.map((it) => ({
        skuId: Number(it.skuId),
        qty: Number(it.qty ?? 1),
      }))
    }

    // 2. 锁价：金额一律以数据库现价计算，绝不信任前端
    const detail = lines.map((l) => {
      assert(Number.isInteger(l.skuId) && l.skuId > 0, 'skuId 非法')
      assert(Number.isInteger(l.qty) && l.qty >= 1 && l.qty <= 99, '数量需在 1-99 之间')
      const row = db
        .prepare(
          `SELECT s.id AS sku_id, s.stock, s.price_diff, s.color_name, s.size,
                  p.id AS product_id, p.title, p.image, p.price, p.status, p.category_id
           FROM product_skus s JOIN products p ON p.id = s.product_id WHERE s.id = ?`
        )
        .get(l.skuId)
      if (!row) throw notFound(`SKU ${l.skuId} 不存在`)
      if (row.status !== 'on') throw new ApiError(CODE.CONFLICT, `「${row.title}」已下架`, 409)
      if (row.stock < l.qty) {
        throw new ApiError(
          CODE.OUT_OF_STOCK,
          `「${row.title} ${row.color_name} ${row.size}」库存不足，仅剩 ${row.stock} 件`,
          409
        )
      }
      const unit = row.price + row.price_diff
      return { ...row, qty: l.qty, cartItemId: l.cartItemId, unit, subtotal: unit * l.qty }
    })

    // 同一 SKU 重复出现时合并校验库存
    const merged = new Map()
    for (const d of detail) {
      merged.set(d.sku_id, (merged.get(d.sku_id) || 0) + d.qty)
    }
    for (const [skuId, qty] of merged) {
      const stock = db.prepare('SELECT stock FROM product_skus WHERE id = ?').get(skuId).stock
      if (stock < qty) throw new ApiError(CODE.OUT_OF_STOCK, `SKU ${skuId} 库存不足`, 409)
    }

    const goodsAmount = detail.reduce((s, d) => s + d.subtotal, 0)
    const freight = goodsAmount >= config.freightFreeThreshold ? 0 : config.freightFlat

    // 3. 优惠券
    let discount = 0
    let couponId = null
    if (couponCode) {
      const coupon = db.prepare('SELECT * FROM coupons WHERE code = ?').get(String(couponCode))
      validateCoupon(coupon, { goodsAmount, items: detail, token })
      discount = coupon.amount
      couponId = coupon.id
    }

    const payable = Math.max(0, goodsAmount + freight - discount)

    // 4. 落库（快照标题与单价，后续改价不影响历史订单）
    const orderNo = bizNo('CY')
    const orderId = tx(() => {
      const r = db
        .prepare(
          `INSERT INTO orders
           (order_no, cart_token, status, goods_amount, freight, discount, payable,
            receiver, phone, address, remark, coupon_id, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
        )
        .run(
          orderNo,
          token,
          'pending_payment',
          goodsAmount,
          freight,
          discount,
          payable,
          receiver.trim(),
          phone.trim(),
          address.trim(),
          remark?.trim() || null,
          couponId,
          now()
        )
      const oid = Number(r.lastInsertRowid)

      const insItem = db.prepare(
        `INSERT INTO order_items
         (order_id, product_id, sku_id, title, color_name, size, image, price, qty)
         VALUES (?,?,?,?,?,?,?,?,?)`
      )
      for (const d of detail) {
        insItem.run(
          oid, d.product_id, d.sku_id, d.title, d.color_name, d.size, d.image, d.unit, d.qty
        )
      }

      // 从购物车结算时清掉对应条目
      if (fromCart) {
        const del = db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?')
        for (const d of detail) if (d.cartItemId) del.run(d.cartItemId, token)
      }
      return oid
    })

    ok(res, orderDetail(orderId, token), { status: 201, message: '订单创建成功' })
  })
)

/* -------------------------------------------------- 订单详情 */
function orderDetail(orderId, token) {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  if (!o) throw notFound('订单不存在')
  if (token && o.cart_token !== token) throw new ApiError(CODE.UNAUTHORIZED, '无权访问该订单', 403)

  const items = db
    .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id')
    .all(orderId)
    .map((it) => ({
      productId: it.product_id,
      skuId: it.sku_id,
      title: it.title,
      image: it.image,
      color: it.color_name,
      size: it.size,
      price: it.price,
      qty: it.qty,
      subtotal: it.price * it.qty,
    }))

  return {
    id: o.id,
    orderNo: o.order_no,
    status: o.status,
    goodsAmount: o.goods_amount,
    freight: o.freight,
    discount: o.discount,
    payable: o.payable,
    receiver: o.receiver,
    phone: o.phone,
    address: o.address,
    remark: o.remark,
    couponId: o.coupon_id,
    createdAt: o.created_at,
    paidAt: o.paid_at,
    items,
  }
}

/* -------------------------------------------------- 订单列表 */
router.get(
  '/',
  wrap(async (req, res) => {
    const token = getToken(req)
    const rows = db
      .prepare('SELECT id FROM orders WHERE cart_token = ? ORDER BY created_at DESC LIMIT 20')
      .all(token)
    ok(res, { list: rows.map((r) => orderDetail(r.id, token)) })
  })
)

/* -------------------------------------------------- 订单详情 */
router.get(
  '/:orderNo',
  wrap(async (req, res) => {
    const token = getToken(req)
    const o = db.prepare('SELECT id FROM orders WHERE order_no = ?').get(req.params.orderNo)
    if (!o) throw notFound('订单不存在')
    ok(res, orderDetail(o.id, token))
  })
)

/* -------------------------------------------------- 取消订单 */
router.post(
  '/:orderNo/cancel',
  wrap(async (req, res) => {
    const token = getToken(req)
    const o = db.prepare('SELECT * FROM orders WHERE order_no = ?').get(req.params.orderNo)
    if (!o) throw notFound('订单不存在')
    if (o.cart_token !== token) throw new ApiError(CODE.UNAUTHORIZED, '无权操作该订单', 403)
    if (!canTransition(o.status, 'cancelled')) {
      throw new ApiError(CODE.ORDER_STATE, `订单状态 ${o.status} 不可取消`, 409)
    }
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('cancelled', o.id)
    ok(res, orderDetail(o.id, token), { message: '订单已取消' })
  })
)

export { orderDetail }
export default router
