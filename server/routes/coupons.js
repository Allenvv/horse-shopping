/** 优惠券领取与我的券包 */
import { Router } from 'express'
import { db, tx, now } from '../db.js'
import { ok, wrap, getToken, notFound, ApiError, CODE } from '../util.js'

const router = Router()

/* ------------------------------------------------------------ 领取优惠券 */
router.post(
  '/:code/claim',
  wrap(async (req, res) => {
    const token = getToken(req)
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(String(req.params.code))
    if (!coupon) throw notFound('优惠券不存在')

    const already = db
      .prepare('SELECT * FROM user_coupons WHERE token = ? AND coupon_id = ?')
      .get(token, coupon.id)
    if (already) {
      throw new ApiError(CODE.CONFLICT, '该优惠券已领取过', 409)
    }
    if (coupon.issued >= coupon.total) {
      throw new ApiError(CODE.CONFLICT, '手慢了，券已被领完', 409)
    }

    tx(() => {
      // 带 condition 的 UPDATE 防止并发超发
      const r = db
        .prepare('UPDATE coupons SET issued = issued + 1 WHERE id = ? AND issued < total')
        .run(coupon.id)
      if (r.changes === 0) throw new ApiError(CODE.CONFLICT, '手慢了，券已被领完', 409)
      db.prepare('INSERT INTO user_coupons (token, coupon_id, status, created_at) VALUES (?,?,?,?)').run(
        token,
        coupon.id,
        'unused',
        now()
      )
    })

    ok(res, {
      code: coupon.code,
      title: coupon.title,
      amount: coupon.amount,
      threshold: coupon.threshold,
      expireDays: coupon.expire_days,
    }, { message: '领取成功' })
  })
)

/* ------------------------------------------------------------ 我的券包 */
router.get(
  '/mine',
  wrap(async (req, res) => {
    const token = getToken(req)
    const rows = db
      .prepare(
        `SELECT uc.status AS hold_status, uc.created_at AS claimed_at, c.*
         FROM user_coupons uc JOIN coupons c ON c.id = uc.coupon_id
         WHERE uc.token = ? ORDER BY uc.created_at DESC`
      )
      .all(token)
      .map((c) => ({
        code: c.code,
        title: c.title,
        amount: c.amount,
        threshold: c.threshold,
        scope: c.scope,
        holdStatus: c.hold_status,
        claimedAt: c.claimed_at,
        expireDays: c.expire_days,
      }))
    ok(res, rows)
  })
)

export default router
