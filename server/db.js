/**
 * SQLite 数据访问层（node:sqlite，Node 22.5+ 内置，无需原生编译）
 *
 * 约定：
 *  - 所有金额一律以「分」为单位存储与传输，避免浮点精度问题；
 *    仅在展示层做 toFixed(2) / 千分位格式化。
 *  - 时间统一存 ISO 8601（UTC）字符串，由展示层转本地时区。
 */
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'server', 'data')
mkdirSync(DATA_DIR, { recursive: true })

export const DB_PATH = join(DATA_DIR, 'chaoye.db')

export const db = new DatabaseSync(DB_PATH)
db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')

/* ------------------------------------------------------------------ *
 * 表结构
 * ------------------------------------------------------------------ */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id       INTEGER PRIMARY KEY,
  slug     TEXT NOT NULL UNIQUE,
  name     TEXT NOT NULL,
  en_name  TEXT NOT NULL,
  image    TEXT NOT NULL,
  sort     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY,
  spu_code      TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  subtitle      TEXT NOT NULL,
  category_id   INTEGER NOT NULL REFERENCES categories(id),
  price         INTEGER NOT NULL,             -- 分
  origin_price  INTEGER NOT NULL,             -- 分（划线价）
  badge         TEXT,
  fabric        TEXT NOT NULL,
  origin_place  TEXT NOT NULL,
  description   TEXT NOT NULL,
  care          TEXT NOT NULL,
  image         TEXT NOT NULL,
  sales         INTEGER NOT NULL DEFAULT 0,   -- 累计销量（含历史订单迁移）
  rating_sum    INTEGER NOT NULL DEFAULT 0,   -- 评分总分（基数 + 实时评价）
  rating_count  INTEGER NOT NULL DEFAULT 0,   -- 评价总数
  status        TEXT NOT NULL DEFAULT 'on',   -- on / off
  listed_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_skus (
  id         INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL,
  color_hex  TEXT NOT NULL,
  size       TEXT NOT NULL,
  stock      INTEGER NOT NULL DEFAULT 0,
  price_diff INTEGER NOT NULL DEFAULT 0,      -- 分，相对 SPU 价的加价
  UNIQUE(product_id, color_name, size)
);

CREATE TABLE IF NOT EXISTS size_charts (
  id         INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size       TEXT NOT NULL,
  chest      TEXT NOT NULL,
  length     TEXT NOT NULL,
  shoulder   TEXT NOT NULL,
  sleeve     TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_name  TEXT NOT NULL,
  rating     INTEGER NOT NULL,
  content    TEXT NOT NULL,
  size       TEXT,
  color      TEXT,
  liked      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS banners (
  id       INTEGER PRIMARY KEY,
  eyebrow  TEXT NOT NULL,
  title    TEXT NOT NULL,
  accent   TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  cta_text TEXT NOT NULL,
  cta_link TEXT NOT NULL,
  meta     TEXT NOT NULL,
  image    TEXT NOT NULL,
  sort     INTEGER NOT NULL DEFAULT 0,
  active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS coupons (
  id          INTEGER PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  amount      INTEGER NOT NULL,               -- 分
  threshold   INTEGER NOT NULL,               -- 分
  scope       TEXT NOT NULL,                  -- all / category:<slug> / newuser
  total       INTEGER NOT NULL,
  issued      INTEGER NOT NULL DEFAULT 0,
  expire_days INTEGER NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS flash_sales (
  id       INTEGER PRIMARY KEY,
  title    TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS flash_items (
  id          INTEGER PRIMARY KEY,
  sale_id     INTEGER NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  flash_price INTEGER NOT NULL,                -- 分
  total_stock INTEGER NOT NULL,
  sold        INTEGER NOT NULL DEFAULT 0,
  UNIQUE(sale_id, product_id)
);

CREATE TABLE IF NOT EXISTS carts (
  id         TEXT PRIMARY KEY,                 -- 客户端生成的匿名购物车令牌
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
  id       INTEGER PRIMARY KEY,
  cart_id  TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  sku_id   INTEGER NOT NULL REFERENCES product_skus(id),
  qty      INTEGER NOT NULL DEFAULT 1,
  added_at TEXT NOT NULL,
  UNIQUE(cart_id, sku_id)
);

CREATE TABLE IF NOT EXISTS user_coupons (
  id            INTEGER PRIMARY KEY,
  token         TEXT NOT NULL,                  -- 匿名用户令牌（后续可换成 user_id）
  coupon_id     INTEGER NOT NULL REFERENCES coupons(id),
  status        TEXT NOT NULL DEFAULT 'unused', -- unused / used / expired
  used_order_id INTEGER REFERENCES orders(id),
  created_at    TEXT NOT NULL,
  UNIQUE(token, coupon_id)
);

CREATE TABLE IF NOT EXISTS addresses (
  id         INTEGER PRIMARY KEY,
  token      TEXT NOT NULL,
  receiver   TEXT NOT NULL,
  phone      TEXT NOT NULL,
  province   TEXT NOT NULL DEFAULT '',
  city       TEXT NOT NULL DEFAULT '',
  district   TEXT NOT NULL DEFAULT '',
  detail     TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  tag        TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id            INTEGER PRIMARY KEY,
  order_no      TEXT NOT NULL UNIQUE,          -- 业务订单号
  cart_token    TEXT,
  status        TEXT NOT NULL DEFAULT 'pending_payment',
  -- pending_payment / paid / shipped / completed / cancelled / closed
  goods_amount  INTEGER NOT NULL,              -- 分
  freight       INTEGER NOT NULL DEFAULT 0,    -- 分
  discount      INTEGER NOT NULL DEFAULT 0,    -- 分
  payable       INTEGER NOT NULL,              -- 分 = goods + freight - discount
  receiver      TEXT NOT NULL,
  phone         TEXT NOT NULL,
  address       TEXT NOT NULL,
  remark        TEXT,
  coupon_id     INTEGER REFERENCES coupons(id),
  created_at    TEXT NOT NULL,
  paid_at       TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id         INTEGER PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  sku_id     INTEGER NOT NULL REFERENCES product_skus(id),
  title      TEXT NOT NULL,                    -- 下单时快照，不随商品改价变化
  color_name TEXT NOT NULL,
  size       TEXT NOT NULL,
  image      TEXT NOT NULL,
  price      INTEGER NOT NULL,                 -- 分，成交单价
  qty        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id           INTEGER PRIMARY KEY,
  payment_no   TEXT NOT NULL UNIQUE,           -- 支付单号
  order_id     INTEGER NOT NULL REFERENCES orders(id),
  order_no     TEXT NOT NULL,
  channel      TEXT NOT NULL,                  -- wechat / alipay
  amount       INTEGER NOT NULL,               -- 分
  status       TEXT NOT NULL DEFAULT 'created',
  -- created / paying / success / failed / closed
  out_trade_no TEXT NOT NULL,                  -- 渠道侧交易号（我方生成）
  channel_trade_no TEXT,                       -- 渠道返回的交易号
  pay_url      TEXT,                           -- 拉起支付/扫码地址
  qr_data_url  TEXT,                           -- 二维码图片（data:image/png;base64）
  fail_reason  TEXT,
  created_at   TEXT NOT NULL,
  expired_at   TEXT,
  paid_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, status);
CREATE INDEX IF NOT EXISTS idx_skus_product ON product_skus(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
`

export function initSchema() {
  db.exec(SCHEMA)
}

/* ------------------------------------------------------------------ *
 * 小工具
 * ------------------------------------------------------------------ */
export const now = () => new Date().toISOString()

/** 生成业务单号：前缀 + yyyyMMddHHmmss + 4 位随机 */
export function bizNo(prefix) {
  const d = new Date()
  const p = (n, l = 2) => String(n).padStart(l, '0')
  const ts =
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${prefix}${ts}${rand}`
}

/** 简易事务封装 */
export function tx(fn) {
  db.exec('BEGIN')
  try {
    const out = fn()
    db.exec('COMMIT')
    return out
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}
