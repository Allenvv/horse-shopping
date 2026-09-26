/**
 * 支付落账服务
 *
 * 关键原则：无论是真实渠道回调，还是沙箱模拟，都走同一个
 * `settlePayment()` —— 保证沙箱验证通过的链路与生产一致。
 */
import { db, tx, now, bizNo } from '../db.js'
import { config, canTransition } from '../config.js'
import { conflict, notFound, ApiError, CODE } from '../util.js'
import QRCode from 'qrcode'
import * as wechat from './wechat.js'
import * as alipay from './alipay.js'
import { isSandbox, CHANNELS } from './gateway.js'

const ADAPTERS = { wechat, alipay }

/* ------------------------------------------------------------------ *
 * 创建支付单
 * ------------------------------------------------------------------ */
export async function createPayment({ order, channel, baseUrl }) {
  if (!CHANNELS.includes(channel)) {
    throw new ApiError(CODE.BAD_REQUEST, `不支持的支付渠道：${channel}`, 400)
  }
  if (order.status !== 'pending_payment') {
    throw new ApiError(
      CODE.ORDER_STATE,
      `订单当前状态为 ${order.status}，不可支付`,
      409
    )
  }

  const adapter = ADAPTERS[channel]
  const outTradeNo = bizNo(channel === 'wechat' ? 'W' : 'A')
  const notifyUrl = `${baseUrl}/api/v1/pay/notify/${channel}`

  const { payUrl, expireAt } = await adapter.createPayment({ order, notifyUrl, outTradeNo })

  const paymentNo = bizNo('P')
  const qrDataUrl = await QRCode.toDataURL(payUrl, {
    width: 512,
    margin: 1,
    color: { dark: '#16130F', light: '#FFFFFF' },
  })

  db.prepare(
    `INSERT INTO payments
     (payment_no, order_id, order_no, channel, amount, status, out_trade_no, pay_url, qr_data_url, created_at, expired_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    paymentNo,
    order.id,
    order.order_no,
    channel,
    order.payable,
    'created',
    outTradeNo,
    payUrl,
    qrDataUrl,
    now(),
    (expireAt || new Date(Date.now() + config.paymentExpireMinutes * 60000)).toISOString()
  )

  return getPayment(paymentNo)
}

/* ------------------------------------------------------------------ *
 * 查询支付单
 * ------------------------------------------------------------------ */
export function getPayment(paymentNo) {
  const row = db
    .prepare('SELECT * FROM payments WHERE payment_no = ?')
    .get(paymentNo)
  if (!row) throw notFound('支付单不存在')
  return row
}

/** 侧向查询：支付单是否属于该订单 */
export function getPaymentForOrder(orderId) {
  return db
    .prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1')
    .get(orderId)
}

/* ------------------------------------------------------------------ *
 * 落账：支付成功后的全部副作用（事务）
 *  1. 支付单 → success
 *  2. 订单 → paid
 *  3. 扣减 SKU 库存
 *  4. 累加商品销量
 *  5. 核销优惠券
 * ------------------------------------------------------------------ */
export function settlePayment(paymentNo, channelTradeNo) {
  return tx(() => {
    const payment = db.prepare('SELECT * FROM payments WHERE payment_no = ?').get(paymentNo)
    if (!payment) throw notFound('支付单不存在')
    if (payment.status === 'success') return payment // 幂等：重复回调直接返回

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(payment.order_id)
    if (!order) throw notFound('订单不存在')
    if (!canTransition(order.status, 'paid')) {
      throw conflict(`订单状态 ${order.status} 不允许变更为 paid`, CODE.ORDER_STATE)
    }

    db.prepare(
      'UPDATE payments SET status=?, channel_trade_no=?, paid_at=? WHERE id=?'
    ).run('success', channelTradeNo || `SANDBOX-${paymentNo}`, now(), payment.id)

    db.prepare('UPDATE orders SET status=?, paid_at=? WHERE id=?').run('paid', now(), order.id)

    // 扣库存 + 加销量
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)
    for (const it of items) {
      const r = db
        .prepare('UPDATE product_skus SET stock = stock - ? WHERE id = ? AND stock >= ?')
        .run(it.qty, it.sku_id, it.qty)
      if (r.changes === 0) {
        throw conflict(`SKU ${it.sku_id} 库存不足，无法完成扣减`, CODE.OUT_OF_STOCK)
      }
      db.prepare('UPDATE products SET sales = sales + ? WHERE id = ?').run(it.qty, it.product_id)
    }

    // 核销优惠券
    if (order.coupon_id) {
      db.prepare(
        'UPDATE user_coupons SET status=?, used_order_id=? WHERE token=? AND coupon_id=? AND status=?'
      ).run('used', order.id, order.cart_token, order.coupon_id, 'unused')
    }

    return db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id)
  })
}

/** 标记支付失败 / 关闭 */
export function closePayment(paymentNo, reason) {
  const p = getPayment(paymentNo)
  if (p.status === 'success') return p
  db.prepare('UPDATE payments SET status=?, fail_reason=? WHERE id=?').run(
    'closed',
    reason || '用户取消',
    p.id
  )
  return getPayment(paymentNo)
}

/* ------------------------------------------------------------------ *
 * 渠道回调入口
 * ------------------------------------------------------------------ */
export async function handleNotify(channel, req) {
  const adapter = ADAPTERS[channel]
  if (!adapter) throw new ApiError(CODE.BAD_REQUEST, `未知支付渠道 ${channel}`, 400)

  const result = await adapter.parseNotify(req)
  if (result.unverified) {
    throw new ApiError(CODE.BAD_REQUEST, '回调验签失败', 400)
  }
  if (!result.outTradeNo) {
    throw new ApiError(CODE.BAD_REQUEST, '回调缺少 out_trade_no', 400)
  }

  const payment = db
    .prepare('SELECT * FROM payments WHERE out_trade_no = ?')
    .get(result.outTradeNo)
  if (!payment) throw notFound('支付单不存在')

  if (result.success) {
    const settled = settlePayment(payment.payment_no, result.channelTradeNo)
    return { handled: true, settled: true, paymentNo: settled.payment_no }
  }
  return { handled: true, settled: false, paymentNo: payment.payment_no }
}

/* ------------------------------------------------------------------ *
 * 订单的支付视图：给前端渲染支付面板
 * ------------------------------------------------------------------ */
export function paymentView(payment) {
  if (!payment) return null
  return {
    paymentNo: payment.payment_no,
    orderNo: payment.order_no,
    channel: payment.channel,
    amount: payment.amount,
    status: payment.status,
    payUrl: payment.pay_url,
    qrDataUrl: payment.qr_data_url,
    expiredAt: payment.expired_at,
    paidAt: payment.paid_at,
    sandbox: isSandbox(payment.channel),
  }
}
