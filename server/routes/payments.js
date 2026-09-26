/** 支付：创建支付单 / 轮询状态 / 渠道回调 / 沙箱模拟 */
import { Router } from 'express'
import { db } from '../db.js'
import { ok, wrap, getToken, assert, notFound, ApiError, CODE } from '../util.js'
import { createPayment, getPayment, handleNotify, settlePayment, paymentView } from '../pay/service.js'
import { isSandbox } from '../pay/gateway.js'
import { orderDetail } from './orders.js'

const router = Router()

/** 校验订单归属并取出订单（含 items） */
function ownOrder(req, orderNo) {
  const token = getToken(req)
  const row = db.prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo)
  if (!row) throw notFound('订单不存在')
  if (row.cart_token !== token) throw new ApiError(CODE.UNAUTHORIZED, '无权操作该订单', 403)
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(row.id)
  return { ...row, items }
}

/* -------------------------------------------------- 创建支付单（拉起支付） */
router.post(
  '/',
  wrap(async (req, res) => {
    assert(req.body?.orderNo, '缺少 orderNo')
    assert(req.body?.channel, '缺少支付渠道 channel')
    const order = ownOrder(req, String(req.body.orderNo))
    const baseUrl = `${req.protocol}://${req.get('host')}`
    const payment = await createPayment({ order, channel: String(req.body.channel), baseUrl })
    ok(res, { payment: paymentView(payment), order: orderDetail(order.id, req.get('x-cart-token') || req.query.token) })
  })
)

/* -------------------------------------------------- 轮询支付结果 */
router.get(
  '/:paymentNo/status',
  wrap(async (req, res) => {
    const token = getToken(req)
    const p = getPayment(String(req.params.paymentNo))
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(p.order_id)
    if (!order || order.cart_token !== token) {
      throw new ApiError(CODE.UNAUTHORIZED, '无权查询该支付单', 403)
    }

    // 过期自动关闭（惰性处理，无需定时任务）
    if (p.status === 'created' && p.expired_at && new Date(p.expired_at) < new Date()) {
      ok(res, { status: 'expired', sandbox: isSandbox(p.channel), orderStatus: order.status })
      return
    }

    ok(res, {
      status: p.status,
      channel: p.channel,
      paidAt: p.paid_at,
      sandbox: isSandbox(p.channel),
      orderStatus: order.status,
    })
  })
)

/* -------------------------------------------------- 渠道异步回调（生产） */
router.post(
  '/notify/:channel',
  wrap(async (req, res) => {
    const channel = String(req.params.channel)
    const result = await handleNotify(channel, req)

    // 渠道约定的应答格式：收到即视为已通知成功
    if (channel === 'wechat') {
      res.status(200).json({ code: 'SUCCESS', message: '成功' })
    } else {
      res.type('text/plain').send('success')
    }
  })
)

/* -------------------------------------------------- 沙箱模拟支付成功（仅本地） */
/**
 * 用途：没有商户凭证时，用与真实回调完全相同的落账函数
 *      settlePayment() 跑通「下单 → 支付 → 回调 → 改单」整条链路。
 * 上线前由 NODE_ENV=production 自动禁用。
 */
router.post(
  '/dev/:paymentNo/simulate-success',
  wrap(async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiError(CODE.BAD_REQUEST, '沙箱接口已在生产环境禁用', 403)
    }
    const token = getToken(req)
    const p = getPayment(String(req.params.paymentNo))
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(p.order_id)
    if (!order || order.cart_token !== token) {
      throw new ApiError(CODE.UNAUTHORIZED, '无权操作该支付单', 403)
    }
    const settled = settlePayment(p.payment_no, `SANDBOX-${p.payment_no}`)
    ok(res, {
      status: settled.status,
      orderStatus: db.prepare('SELECT status FROM orders WHERE id = ?').get(order.id).status,
    })
  })
)

export default router
