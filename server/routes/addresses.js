/** 收货地址簿（按匿名令牌隔离，接入登录后替换 token 即可） */
import { Router } from 'express'
import { db, tx, now } from '../db.js'
import { ok, wrap, getToken, assert, requireFields, isPhone, notFound, ApiError, CODE } from '../util.js'

const router = Router()

const shape = (r) => ({
  id: r.id,
  receiver: r.receiver,
  phone: r.phone,
  province: r.province,
  city: r.city,
  district: r.district,
  detail: r.detail,
  tag: r.tag,
  isDefault: r.is_default === 1,
  full: `${r.province}${r.city}${r.district}${r.detail}`,
})

router.get(
  '/',
  wrap(async (req, res) => {
    const token = getToken(req)
    const rows = db
      .prepare('SELECT * FROM addresses WHERE token = ? ORDER BY is_default DESC, id DESC')
      .all(token)
    ok(res, rows.map(shape))
  })
)

router.post(
  '/',
  wrap(async (req, res) => {
    const token = getToken(req)
    requireFields(req.body || {}, ['receiver', 'phone', 'detail'])
    const { receiver, phone, province = '', city = '', district = '', detail, tag = null, isDefault } = req.body
    assert(isPhone(phone), '手机号格式不正确')
    assert(detail.trim().length >= 4, '详细地址过短')

    const id = tx(() => {
      if (isDefault) {
        db.prepare('UPDATE addresses SET is_default = 0 WHERE token = ?').run(token)
      }
      const count = db.prepare('SELECT COUNT(*) AS c FROM addresses WHERE token = ?').get(token).c
      const r = db
        .prepare(
          `INSERT INTO addresses (token, receiver, phone, province, city, district, detail, is_default, tag, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)`
        )
        .run(
          token, receiver.trim(), phone.trim(), province, city, district, detail.trim(),
          isDefault || count === 0 ? 1 : 0, tag, now()
        )
      return Number(r.lastInsertRowid)
    })

    const row = db.prepare('SELECT * FROM addresses WHERE id = ?').get(id)
    ok(res, shape(row), { status: 201, message: '地址已保存' })
  })
)

router.patch(
  '/:id',
  wrap(async (req, res) => {
    const token = getToken(req)
    const id = Number(req.params.id)
    const row = db.prepare('SELECT * FROM addresses WHERE id = ? AND token = ?').get(id, token)
    if (!row) throw notFound('地址不存在')

    const fields = ['receiver', 'phone', 'province', 'city', 'district', 'detail', 'tag']
    const patch = {}
    for (const f of fields) if (req.body?.[f] !== undefined) patch[f] = req.body[f]
    if (patch.phone !== undefined) assert(isPhone(patch.phone), '手机号格式不正确')

    tx(() => {
      if (req.body?.isDefault) {
        db.prepare('UPDATE addresses SET is_default = 0 WHERE token = ?').run(token)
        db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(id)
      }
      const keys = Object.keys(patch)
      if (keys.length) {
        db.prepare(`UPDATE addresses SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`)
          .run(...keys.map((k) => patch[k]), id)
      }
    })

    ok(res, shape(db.prepare('SELECT * FROM addresses WHERE id = ?').get(id)))
  })
)

router.delete(
  '/:id',
  wrap(async (req, res) => {
    const token = getToken(req)
    const id = Number(req.params.id)
    const row = db.prepare('SELECT * FROM addresses WHERE id = ? AND token = ?').get(id, token)
    if (!row) throw notFound('地址不存在')
    db.prepare('DELETE FROM addresses WHERE id = ?').run(id)
    // 删掉默认地址后，把最新的一条顶上来
    if (row.is_default === 1) {
      const next = db.prepare('SELECT id FROM addresses WHERE token = ? ORDER BY id DESC LIMIT 1').get(token)
      if (next) db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(next.id)
    }
    ok(res, { id }, { message: '地址已删除' })
  })
)

export default router
