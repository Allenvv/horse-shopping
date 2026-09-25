import { useEffect } from 'react'
import { formatPrice } from '../data/catalog'
import { IconClose, IconPlus, IconCart, IconArrowRight, IconTicket } from './Icons'
import './CartDrawer.css'

export default function CartDrawer({ open, items, onClose, onChangeQty, onRemove }) {
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0)
  const count = items.reduce((sum, it) => sum + it.qty, 0)
  const freeShipping = subtotal >= 599
  const gap = Math.max(0, 599 - subtotal)

  /* 打开时锁定页面滚动 + 支持 Esc 关闭 */
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <>
      <div className={`cart-scrim ${open ? 'is-open' : ''}`} onClick={onClose} aria-hidden="true" />

      <aside
        className={`cart ${open ? 'is-open' : ''}`}
        aria-label="购物车"
        aria-hidden={!open}
      >
        <header className="cart__head">
          <h2>
            购物车
            {count > 0 && <span className="cart__count">{count}</span>}
          </h2>
          <button className="cart__close" onClick={onClose} aria-label="关闭购物车">
            <IconClose size={20} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="cart__empty">
            <span className="cart__empty-icon">
              <IconCart size={30} />
            </span>
            <p>购物车还是空的</p>
            <span>挑几件喜欢的，我们帮你留着</span>
            <button className="btn btn--primary btn--sm" onClick={onClose}>
              继续逛逛
              <IconArrowRight size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="cart__ship">
              {freeShipping ? (
                <span className="cart__ship-done">已满 599 元，本单顺丰包邮</span>
              ) : (
                <>
                  <span>
                    再买 <b>¥{formatPrice(gap)}</b> 即可包邮
                  </span>
                  <span className="cart__ship-bar">
                    <i style={{ width: `${(subtotal / 599) * 100}%` }} />
                  </span>
                </>
              )}
            </div>

            <ul className="cart__list">
              {items.map((it) => (
                <li className="cart-item" key={it.key}>
                  <img className="cart-item__img" src={it.image} alt={it.title} />
                  <div className="cart-item__info">
                    <p className="cart-item__title">{it.title}</p>
                    <p className="cart-item__meta">
                      <span className="cart-item__swatch" style={{ background: it.color }} />
                      已选配色
                    </p>
                    <div className="cart-item__row">
                      <span className="cart-item__price">¥{formatPrice(it.price)}</span>
                      <div className="qty">
                        <button
                          onClick={() => onChangeQty(it.key, it.qty - 1)}
                          aria-label="减少数量"
                        >
                          −
                        </button>
                        <span>{it.qty}</span>
                        <button
                          onClick={() => onChangeQty(it.key, it.qty + 1)}
                          aria-label="增加数量"
                        >
                          <IconPlus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    className="cart-item__remove"
                    onClick={() => onRemove(it.key)}
                    aria-label={`移除 ${it.title}`}
                  >
                    <IconClose size={15} />
                  </button>
                </li>
              ))}
            </ul>

            <footer className="cart__foot">
              <div className="cart__coupon">
                <IconTicket size={16} />
                <span>有 3 张优惠券可用，结算时自动抵扣</span>
              </div>

              <div className="cart__sum">
                <span>商品小计</span>
                <b>¥{formatPrice(subtotal)}</b>
              </div>
              <div className="cart__sum cart__sum--muted">
                <span>运费</span>
                <span>{freeShipping ? '免运费' : '¥15'}</span>
              </div>

              <button className="btn btn--primary cart__checkout">
                去结算（{count} 件）
                <IconArrowRight size={17} />
              </button>
              <p className="cart__note">支持 7 天无理由退换 · 假一赔十</p>
            </footer>
          </>
        )}
      </aside>
    </>
  )
}
