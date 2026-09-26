/** 金额工具：后端一律以「分」传输，展示层在此统一转换 */

/** 分 → 元（数字） */
export const fenToYuan = (fen) => (Number(fen || 0) / 100)

/**
 * 计数格式化（销量 / 件数）
 * 注意：不能复用 fmt()，那会把 5120 当成 5120 分读成 51.2 元。
 */
export const num = (n) => Number(n || 0).toLocaleString('zh-CN')

/** 分 → 元字符串（带千分位，无小数；¥1,299） */
export function fmt(fen) {
  const yuan = Number(fen || 0) / 100
  return yuan.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

/** 分 → 元字符串（两位小数，用于结算金额；¥1,299.00） */
export function fmt2(fen) {
  const yuan = Number(fen || 0) / 100
  return yuan.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 折扣百分比（1-99），无折扣返回 null */
export function offPercent(price, originPrice) {
  if (!originPrice || originPrice <= price) return null
  return Math.round((1 - price / originPrice) * 100)
}

/** 相对当前时间的友好时间 */
export function timeAgo(iso) {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const day = 86400000
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < day) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < day * 30) return `${Math.floor(diff / day)} 天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}
