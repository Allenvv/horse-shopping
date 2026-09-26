import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/services'
import { useStore } from '../store/AppStore'
import { fmt2, fmt } from '../utils/money'
import QuantityStepper from '../components/QuantityStepper'
import { EmptyState } from '../components/State'
import { IconArrowRight, IconCart, IconClose, IconTicket } from '../components/Icons'
import './pages.css'

export default function CartPage() {
  const { cart, setCart, setCheckout, refreshCart } = useStore()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    refreshCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const items = cart.items || []
  const count = cart.count || 0
  const goods = cart.goodsAmount || 0
  const threshold = cart.freeShippingThreshold || 59900
  const freeShipping = goods >= threshold
  const gap = cart.freeShippingGap || 0

  const apply = (promise, key) => {
    setBusy(key)
    promise
      .then(setCart)
      .catch(() => {})
      .finally(() => setBusy(null))
  }

  const payableItems = items.filter((i) => i.available && !i.stockWarning)

  if (items.length === 0) {
    return (
      <div className="container page">
        <h1 className="page-title">购物车</h1>
        <EmptyState
          text="购物车还是空的"
          hint="挑几件喜欢的，我们帮你留着"
          action={
            <Link className="btn btn--primary" to="/list">
              去逛逛
              <IconArrowRight size={17} />
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="container page">
      <h1 className="page-title">
        购物车 <span className="page-title__count">{count} 件</span>
      </h1>

      <div className="cart-layout">
        <div className="cart-main">
          {/* 包邮进度 */}
          <div className={`ship-bar ${freeShipping ? 'is-done' : ''}`}>
            {freeShipping ? (
              <span>已满 ¥{fmt(threshold)}，本单包邮</span>
            ) : (
              <>
                <span>
                  再买 <b>¥{fmt2(gap)}</b> 即可包邮
                </span>
                <span className="ship-bar__track">
                  <i style={{ width: `${Math.min(100, (goods / threshold) * 100)}%` }} />
                </span>
              </>
            )}
          </div>

          <ul className="cart-list">
            {items.map((it) => (
              <li
                key={it.cartItemId}
                className={`cart-row ${!it.available || it.stockWarning ? 'is-blocked' : ''} ${
                  busy === it.cartItemId ? 'is-busy' : ''
                }`}
              >
                <Link className="cart-row__media" to={`/product/${it.productId}`}>
                  <img src={it.image} alt={it.title} />
                </Link>

                <div className="cart-row__info">
                  <Link className="cart-row__title" to={`/product/${it.productId}`}>
                    {it.title}
                  </Link>
                  <p className="cart-row__sku">
                    <span className="swatch-dot" style={{ background: it.color.hex }} />
                    {it.color.name} / {it.size}
                  </p>
                  {it.stockWarning === 'out' && (
                    <p className="cart-row__warn">该款式已售罄，请更换尺码</p>
                  )}
                  {it.stockWarning === 'exceed' && (
                    <p className="cart-row__warn">库存仅剩 {it.maxQty} 件，请调整数量</p>
                  )}
                </div>

                <div className="cart-row__price">
                  <b>¥{fmt2(it.unitPrice)}</b>
                  <em>小计 ¥{fmt2(it.subtotal)}</em>
                </div>

                <div className="cart-row__qty">
                  <QuantityStepper
                    value={it.qty}
                    max={it.maxQty}
                    size="sm"
                    onChange={(n) => apply(api.updateCartItem(it.cartItemId, n), it.cartItemId)}
                  />
                </div>

                <button
                  className="cart-row__remove"
                  onClick={() => apply(api.removeCartItem(it.cartItemId), it.cartItemId)}
                  aria-label={`移除 ${it.title}`}
                >
                  <IconClose size={15} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* 结算侧栏 */}
        <aside className="cart-aside">
          <div className="cart-aside__card">
            <h2>订单摘要</h2>
            <div className="sum-row">
              <span>商品金额</span>
              <span>¥{fmt2(goods)}</span>
            </div>
            <div className="sum-row">
              <span>运费</span>
              <span>{freeShipping ? <em className="sum-free">包邮</em> : `¥${fmt2(1500)}`}</span>
            </div>
            <div className="sum-row sum-row--hint">
              <span>
                <IconTicket size={14} /> 优惠券
              </span>
              <span>结算时可用</span>
            </div>

            <div className="sum-total">
              <span>合计</span>
              <b>¥{fmt2(goods + (freeShipping ? 0 : 1500))}</b>
            </div>

            <button
              className="btn btn--primary cart-aside__go"
              onClick={() => setCheckout({})}
              disabled={payableItems.length === 0}
            >
              去结算（{count} 件）
              <IconArrowRight size={17} />
            </button>

            {cart.hasIssue && (
              <p className="cart-aside__warn">部分商品库存有变化，请先调整后再结算</p>
            )}
            <p className="cart-aside__note">支持 7 天无理由退换 · 假一赔十</p>
          </div>

          <Link className="cart-aside__more" to="/list">
            <IconCart size={16} />
            继续挑选商品
          </Link>
        </aside>
      </div>
    </div>
  )
}
