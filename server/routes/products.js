/** 商品列表 / 详情 / 评价 */
import { Router } from 'express'
import { db } from '../db.js'
import { ok, wrap, pageQuery, notFound, assert } from '../util.js'

const router = Router()

/* ------------------------------------------------------ 查询条件白名单 */
const SORTS = {
  default: 'p.sales DESC, p.id ASC', // 综合推荐
  hot: 'p.sales DESC', // 销量优先
  new: 'p.listed_at DESC', // 最新上架
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  rating: '(p.rating_sum * 1.0 / MAX(p.rating_count, 1)) DESC',
}

/** 列表卡片结构：只给前端渲染所需字段，避免拖出整行 */
function toCard(p, colors) {
  return {
    id: p.id,
    spuCode: p.spu_code,
    title: p.title,
    subtitle: p.subtitle,
    categoryId: p.category_id,
    categorySlug: p.category_slug,
    price: p.price,
    originPrice: p.origin_price,
    discountPercent:
      p.origin_price > p.price ? Math.round((1 - p.price / p.origin_price) * 100) : 0,
    badge: p.badge,
    image: p.image,
    sales: p.sales,
    rating: p.rating_count > 0 ? Number((p.rating_sum / p.rating_count).toFixed(1)) : null,
    reviewCount: p.rating_count,
    colors,
  }
}

const loadColors = db.prepare(
  'SELECT DISTINCT color_name AS name, color_hex AS hex FROM product_skus WHERE product_id = ?'
)

const CARD_FIELDS = `
  p.id, p.spu_code, p.title, p.subtitle, p.category_id, p.price, p.origin_price,
  p.badge, p.image, p.sales, p.rating_sum, p.rating_count, p.listed_at,
  c.slug AS category_slug`

/* ------------------------------------------------------------ 商品列表 */
router.get(
  '/',
  wrap(async (req, res) => {
    const { page, pageSize, offset } = pageQuery(req.query)
    const where = ["p.status = 'on'"]
    const params = {}

    if (req.query.category) {
      where.push('c.slug = @category')
      params.category = String(req.query.category)
    }
    if (req.query.badge) {
      where.push('p.badge = @badge')
      params.badge = String(req.query.badge)
    }
    if (req.query.q) {
      where.push('(p.title LIKE @q OR p.subtitle LIKE @q OR p.fabric LIKE @q)')
      params.q = `%${String(req.query.q).trim()}%`
    }
    if (req.query.minPrice) {
      where.push('p.price >= @minPrice')
      params.minPrice = Number(req.query.minPrice)
    }
    if (req.query.maxPrice) {
      where.push('p.price <= @maxPrice')
      params.maxPrice = Number(req.query.maxPrice)
    }

    const orderBy = SORTS[req.query.sort] || SORTS.default
    const whereSql = `FROM products p JOIN categories c ON c.id = p.category_id WHERE ${where.join(' AND ')}`

    const total = db.prepare(`SELECT COUNT(*) AS c ${whereSql}`).get(params).c
    const rows = db
      .prepare(`SELECT ${CARD_FIELDS} ${whereSql} ORDER BY ${orderBy} LIMIT @limit OFFSET @offset`)
      .all({ ...params, limit: pageSize, offset })

    ok(res, {
      list: rows.map((p) => toCard(p, loadColors.all(p.id))),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
    })
  })
)

/* ------------------------------------------------------------ 商品详情 */
router.get(
  '/:id',
  wrap(async (req, res) => {
    const id = Number(req.params.id)
    assert(Number.isInteger(id) && id > 0, '商品 id 非法')

    const p = db
      .prepare(
        `SELECT p.*, c.slug AS category_slug, c.name AS category_name
         FROM products p JOIN categories c ON c.id = p.category_id
         WHERE p.id = ? AND p.status = 'on'`
      )
      .get(id)
    if (!p) throw notFound('商品不存在或已下架')

    // SKU 按颜色分组，前端直接渲染「选颜色 → 选尺码」两级选择器
    const skus = db
      .prepare('SELECT id, color_name, color_hex, size, stock, price_diff FROM product_skus WHERE product_id = ? ORDER BY id')
      .all(id)
    const colors = []
    for (const s of skus) {
      let c = colors.find((x) => x.name === s.color_name)
      if (!c) {
        c = { name: s.color_name, hex: s.color_hex, sizes: [], totalStock: 0 }
        colors.push(c)
      }
      c.sizes.push({ skuId: s.id, size: s.size, stock: s.stock, priceDiff: s.price_diff })
      c.totalStock += s.stock
    }

    const sizeChart = db
      .prepare('SELECT size, chest, length, shoulder, sleeve FROM size_charts WHERE product_id = ? ORDER BY id')
      .all(id)

    const reviews = db
      .prepare(
        `SELECT id, user_name, rating, content, size, color, liked, created_at
         FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 5`
      )
      .all(id)

    ok(res, {
      ...toCard(p, colors.map(({ name, hex }) => ({ name, hex }))),
      fabric: p.fabric,
      originPlace: p.origin_place,
      description: p.description,
      care: p.care,
      categoryName: p.category_name,
      colors,
      sizeChart,
      reviews,
    })
  })
)

/* ------------------------------------------------------------ 评价列表 */
router.get(
  '/:id/reviews',
  wrap(async (req, res) => {
    const id = Number(req.params.id)
    assert(Number.isInteger(id) && id > 0, '商品 id 非法')
    const { page, pageSize, offset } = pageQuery(req.query, { defaultSize: 10, maxSize: 50 })

    const total = db.prepare('SELECT COUNT(*) AS c FROM reviews WHERE product_id = ?').get(id).c
    const list = db
      .prepare(
        `SELECT id, user_name, rating, content, size, color, liked, created_at
         FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(id, pageSize, offset)

    const dist = db
      .prepare('SELECT rating, COUNT(*) AS c FROM reviews WHERE product_id = ? GROUP BY rating')
      .all(id)

    ok(res, {
      list,
      distribution: Object.fromEntries(dist.map((d) => [d.rating, d.c])),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
    })
  })
)

export default router
