/** 首页元数据：轮播 / 品类 / 优惠券 / 秒杀 / 服务保障 / 可用支付渠道 */
import { Router } from 'express'
import { db } from '../db.js'
import { config } from '../config.js'
import { ok, wrap } from '../util.js'
import { listChannels } from '../pay/gateway.js'

const router = Router()

/* ------------------------------------------------------------ 轮播图 */
router.get(
  '/banners',
  wrap(async (req, res) => {
    const rows = db
      .prepare('SELECT * FROM banners WHERE active = 1 ORDER BY sort ASC')
      .all()
    ok(res, rows)
  })
)

/* ------------------------------------------------------------ 品类 */
router.get(
  '/categories',
  wrap(async (req, res) => {
    const rows = db
      .prepare(
        `SELECT c.id, c.slug, c.name, c.en_name AS enName, c.image, c.sort,
                (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status='on') AS productCount
         FROM categories c ORDER BY c.sort ASC`
      )
      .all()
    ok(res, rows)
  })
)

/* ------------------------------------------------------------ 服务保障 */
router.get(
  '/guarantees',
  wrap(async (req, res) => {
    ok(res, config.guarantees)
  })
)

/* ------------------------------------------------------------ 优惠券 */
router.get(
  '/coupons',
  wrap(async (req, res) => {
    const rows = db
      .prepare('SELECT * FROM coupons WHERE active = 1 ORDER BY amount DESC')
      .all()
      .map((c) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        amount: c.amount,
        threshold: c.threshold,
        scope: c.scope,
        expireDays: c.expire_days,
        remaining: Math.max(0, c.total - c.issued),
        soldOut: c.issued >= c.total,
      }))
    ok(res, rows)
  })
)

/* ------------------------------------------------------------ 限时秒杀 */
router.get(
  '/flash-sale',
  wrap(async (req, res) => {
    const sale = db
      .prepare('SELECT * FROM flash_sales ORDER BY id DESC LIMIT 1')
      .get()
    if (!sale) return ok(res, null)

    const items = db
      .prepare(
        `SELECT fi.id AS flashItemId, fi.flash_price, fi.total_stock, fi.sold,
                p.id, p.title, p.subtitle, p.image, p.price AS origin_price, p.spu_code
         FROM flash_items fi JOIN products p ON p.id = fi.product_id
         WHERE fi.sale_id = ? ORDER BY fi.id ASC`
      )
      .all(sale.id)
      .map((it) => {
        const claimed = it.total_stock - it.sold
        return {
          flashItemId: it.flashItemId,
          product: {
            id: it.id,
            spuCode: it.spu_code,
            title: it.title,
            subtitle: it.subtitle,
            image: it.image,
            originPrice: it.origin_price,
          },
          flashPrice: it.flash_price,
          offPercent: Math.round((1 - it.flash_price / it.origin_price) * 100),
          totalStock: it.total_stock,
          sold: it.sold,
          remaining: Math.max(0, claimed),
          // 进度条 = 已抢百分比，完全由库存与销量推导，不再写死
          claimedPercent: Math.min(100, Math.round((it.sold / it.total_stock) * 100)),
        }
      })

    ok(res, {
      id: sale.id,
      title: sale.title,
      startAt: sale.start_at,
      endAt: sale.end_at,
      serverTime: new Date().toISOString(),
      items,
    })
  })
)

/* ------------------------------------------------------------ 支付渠道 */
router.get(
  '/pay-channels',
  wrap(async (req, res) => {
    ok(res, listChannels())
  })
)

export default router
