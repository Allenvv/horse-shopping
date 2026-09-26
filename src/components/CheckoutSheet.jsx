import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/services'
import { useStore } from '../store/AppStore'
import { useRequest } from '../hooks/useRequest'
import { fmt2, fmt } from '../utils/money'
import { ErrorState, EmptyState } from './State'
import { IconArrowRight, IconClose, IconTicket, IconCheck } from './Icons'
import './CheckoutSheet.css'

const ADDRESS_KEY = 'chaoye.address'

const readSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(ADDRESS_KEY) || 'null') || {}
  } catch {
    return {}
  }
}

/** 结算弹层：确认收货信息 → 选优惠券 → 提交订单 → 拉起支付 */
export default function CheckoutSheet() {
  const { checkout, setCheckout, setPayment, pushToast, refreshCart, closeSkuPicker } = useStore()
  const open = Boolean(checkout)
  const buyNow = checkout?.buyNow // 立即购买模式：不走购物车

  const saved = readSaved()
  const [form, setForm] = useState({
    receiver: saved.receiver || '',
    phone: saved.phone || '',
    address: saved.address || '',
    remark: '',
  })
  const [couponCode, setCouponCode] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const { data: preview, loading, refresh } = useRequest(() => api.previewCheckout(), [], {
    immediate: false,
  })

  const load = useCallback(() => {
    if (!buyNow) refresh()
  }, [buyNow, refresh])

  useEffect(() => {
    if (!open) return undefined
    load()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, load])

  const close = () => setCheckout(null)

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const items = buyNow
    ? [] // 立即购买：明细以订单返回为准
    : preview?.items || []
  const goodsAmount = buyNow ? 0 : preview?.goodsAmount || 0
  const freight = buyNow ? 0 : preview?.freight || 0
  const coupons = preview?.availableCoupons || []

  const [discount, setDiscount] = useState(0)
  useEffect(() => {
    const c = coupons.find((x) => x.code === couponCode)
    setDiscount(goodsAmount >= (c?.threshold || 0) ? c?.amount || 0 : 0)
  }, [couponCode, coupons, goodsAmount])

  const payable = Math.max(0, goodsAmount + freight - discount)

  const submit = async () => {
    setError(null)
    if (!form.receiver.trim() || form.receiver.trim().length < 2) return setError('请输入收货人姓名')
    if (!/^1[3-9]\d{9}$/.test(form.phone)) return setError('请输入正确的手机号')
    if (form.address.trim().length < 8) return setError('请输入完整的收货地址')
    if (!buyNow && (!items.length)) return setError('没有可结算的商品')

    setSubmitting(true)
    try {
      const order = await api.createOrder({
        fromCart: !buyNow,
        items: buyNow ? buyNow.map((b) => ({ skuId: b.skuId, qty: b.qty })) : undefined,
        receiver: form.receiver.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        remark: form.remark.trim(),
        couponCode: couponCode || undefined,
      })
      localStorage.setItem(ADDRESS_KEY, JSON.stringify({
        receiver: form.receiver.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      }))
      await refreshCart()
      closeSkuPicker?.()
      setCheckout(null)
      setPayment({ order })
      pushToast(`订单 ${order.orderNo} 已创建`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null
  const blocked = preview?.blockedItems || []

  return (
    <>
      <div className="sheet-scrim is-open" onClick={close} aria-hidden="true" />
      <aside className="sheet checkout-sheet" role="dialog" aria-label="确认订单">
        <header className="checkout-sheet__head">
          <h3>确认订单</h3>
          <button className="sheet__close" onClick={close} aria-label="关闭">
            <IconClose size={20} />
          </button>
        </header>

        {/* 收货信息 */}
        <section className="checkout-block">
          <h4>收货信息</h4>
          <div className="checkout-form">
            <label>
              <span>收货人</span>
              <input
                value={form.receiver}
                onChange={(e) => setField('receiver', e.target.value)}
                placeholder="请填写真实姓名"
                maxLength={30}
              />
            </label>
            <label>
              <span>手机号</span>
              <input
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="11 位手机号"
                inputMode="numeric"
              />
            </label>
            <label className="checkout-form__full">
              <span>收货地址</span>
              <input
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                placeholder="省 / 市 / 区 / 街道门牌"
                maxLength={100}
              />
            </label>
            <label className="checkout-form__full">
              <span>备注（选填）</span>
              <input
                value={form.remark}
                onChange={(e) => setField('remark', e.target.value)}
                placeholder="如：工作日白天送货"
                maxLength={100}
              />
            </label>
          </div>
        </section>

        {/* 商品明细 */}
        <section className="checkout-block">
          <h4>商品明细 {!buyNow && `（${items.length} 件）`}</h4>
          {buyNow ? (
            <p className="checkout-hint">立即购买商品，明细以订单为准</p>
          ) : loading ? (
            <p className="checkout-hint">加载中…</p>
          ) : items.length === 0 ? (
            <EmptyState text="购物车为空" compact />
          ) : (
            <ul className="checkout-items">
              {items.map((it) => (
                <li key={it.cartItemId}>
                  <img src={it.image} alt="" />
                  <div className="checkout-items__info">
                    <p className="checkout-items__title">{it.title}</p>
                    <p className="checkout-items__sku">
                      {it.color.name} / {it.size} × {it.qty}
                    </p>
                  </div>
                  <span className="checkout-items__price">¥{fmt2(it.subtotal)}</span>
                </li>
              ))}
            </ul>
          )}

          {blocked.length > 0 && (
            <p className="checkout-warn">
              {blocked.length} 件商品因库存变化未参与结算，请返回购物车查看
            </p>
          )}
        </section>

        {/* 优惠券 */}
        {coupons.length > 0 && (
          <section className="checkout-block">
            <h4>优惠券</h4>
            <div className="checkout-coupons">
              {coupons.map((c) => {
                const usable = goodsAmount >= c.threshold
                const active = couponCode === c.code && usable
                return (
                  <button
                    key={c.code}
                    className={`coupon-pick ${active ? 'is-active' : ''} ${
                      usable ? '' : 'is-disabled'
                    }`}
                    onClick={() => usable && setCouponCode(active ? null : c.code)}
                    disabled={!usable}
                  >
                    <span className="coupon-pick__amt">
                      <i>¥</i>
                      {fmt(c.amount)}
                    </span>
                    <span className="coupon-pick__txt">
                      {c.title}
                      <em>{usable ? `满 ¥${fmt(c.threshold)} 可用` : `差 ¥${fmt(c.threshold - goodsAmount)}`}</em>
                    </span>
                    {active && <IconCheck size={16} />}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* 金额 */}
        <section className="checkout-block checkout-block--sums">
          <div className="checkout-sum">
            <span>商品金额</span>
            <span>¥{fmt2(goodsAmount)}</span>
          </div>
          <div className="checkout-sum">
            <span>运费</span>
            <span>
              {freight === 0 ? (
                <em className="checkout-sum__free">包邮</em>
              ) : (
                `¥${fmt2(freight)}`
              )}
            </span>
          </div>
          <div className="checkout-sum">
            <span>优惠</span>
            <span className="checkout-sum__off">
              {discount > 0 ? `-¥${fmt2(discount)}` : '—'}
            </span>
          </div>
        </section>

        {error && <p className="checkout-error">{error}</p>}

        <footer className="checkout-sheet__foot">
          <div className="checkout-sheet__payable">
            <span>应付</span>
            <b>¥{fmt2(payable)}</b>
          </div>
          <button
            className="btn btn--primary checkout-sheet__submit"
            onClick={submit}
            disabled={submitting || (!buyNow && items.length === 0)}
          >
            {submitting ? '提交中…' : '提交订单'}
            <IconArrowRight size={17} />
          </button>
        </footer>
      </aside>
    </>
  )
}
