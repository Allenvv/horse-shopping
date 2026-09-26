/** HTTP 层通用工具：统一响应包络、业务错误、参数校验 */

import { randomUUID } from 'node:crypto'

/* ------------------------------------------------------------- 响应包络 */
/**
 * 统一响应结构：
 *   { code: 0, message: 'ok', data, requestId, ts }
 * code === 0 表示成功；非 0 为业务错误码，与 HTTP 状态码配合使用。
 */
export function ok(res, data = null, { status = 200, message = 'ok' } = {}) {
  res.status(status).json({
    code: 0,
    message,
    data,
    requestId: res.locals?.requestId || randomUUID().slice(0, 8),
    ts: Date.now(),
  })
}

/* ----------------------------------------------------------- 业务错误码 */
export const CODE = {
  BAD_REQUEST: 40000,
  UNAUTHORIZED: 40100,
  NOT_FOUND: 40400,
  CONFLICT: 40900,
  OUT_OF_STOCK: 40901,
  COUPON_INVALID: 40902,
  ORDER_STATE: 40903,
  PAY_STATE: 40904,
  INTERNAL: 50000,
}

export class ApiError extends Error {
  constructor(code, message, status = 400, detail = null) {
    super(message)
    this.code = code
    this.status = status
    this.detail = detail
  }
}

export const badRequest = (msg, detail) => new ApiError(CODE.BAD_REQUEST, msg, 400, detail)
export const notFound = (msg = '资源不存在') => new ApiError(CODE.NOT_FOUND, msg, 404)
export const conflict = (msg, code = CODE.CONFLICT) => new ApiError(code, msg, 409)

/** Express 异步路由包装：把抛出的 ApiError 交给统一错误中间件 */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

/* ------------------------------------------------------------- 参数校验 */
/** 断言条件成立，否则抛 400 */
export function assert(cond, message, detail) {
  if (!cond) throw badRequest(message, detail)
}

/** 字符串非空校验 */
export function requireFields(body, fields) {
  const missing = fields.filter((f) => {
    const v = body?.[f]
    return v === undefined || v === null || v === '' || (typeof v === 'string' && !v.trim())
  })
  if (missing.length) throw badRequest(`缺少必填字段：${missing.join(', ')}`, { missing })
}

/** 手机号（大陆） */
export const isPhone = (v) => /^1[3-9]\d{9}$/.test(String(v || ''))

/** 清洗分页参数 */
export function pageQuery(query, { defaultSize = 12, maxSize = 48 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const pageSize = Math.min(maxSize, Math.max(1, Number.parseInt(query.pageSize, 10) || defaultSize))
  return { page, pageSize, offset: (page - 1) * pageSize }
}

/** 购物车 / 匿名用户令牌：从 header 或 query 取，统一校验格式 */
export function getToken(req) {
  const raw = req.get('x-cart-token') || req.query.token || req.body?.token
  const token = String(raw || '').trim()
  assert(token && token.length >= 8 && token.length <= 64, '缺少有效的用户令牌 x-cart-token')
  return token
}
