import { useEffect, useMemo, useState } from 'react'
import { COUPONS, PRODUCTS, formatPrice } from '../data/catalog'
import { IconArrowRight, IconCheck, IconClock, IconTicket } from './Icons'
import './PromoSection.css'

/** 秒杀商品：取折扣力度最大的几件 */
const FLASH_IDS = [4, 10, 9]
const FLASH_STOCK = { 4: 76, 10: 91, 9: 58 }

const pad = (n) => String(n).padStart(2, '0')

/** 距离今天 24:00 的剩余时间 */
function useCountdown() {
  const [left, setLeft] = useState(() => msToMidnight())

  useEffect(() => {
    const t = setInterval(() => setLeft(msToMidnight()), 1000)
    return () => clearInterval(t)
  }, [])

  return useMemo(() => {
    const total = Math.max(0, Math.floor(left / 1000))
    return {
      h: pad(Math.floor(total / 3600)),
      m: pad(Math.floor((total % 3600) / 60)),
      s: pad(total % 60),
    }
  }, [left])
}

function msToMidnight() {
  const now = new Date()
  const end = new Date(now)
  end.setHours(24, 0, 0, 0)
  return end - now
}

export default function PromoSection({ onAddToCart }) {
  const { h, m, s } = useCountdown()
  const [claimed, setClaimed] = useState([])

  const flashItems = useMemo(
    () => FLASH_IDS.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean),
    []
  )

  const claim = (id) => setClaimed((prev) => (prev.includes(id) ? prev : [...prev, id]))

  return (
    <section className="section promo" id="coupon">
      <div className="container">
        <div className="section-head">
          <div className="section-head__left">
            <span className="section-head__eyebrow">Limited offers</span>
            <h2 className="section-head__title">今日活动 · 限时开抢</h2>
            <p className="section-head__desc">
              每日 10:00 上新秒杀名额，优惠券可与秒杀价叠加使用。
            </p>
          </div>
          <a className="section-head__action" href="#all-offers">
            全部活动
            <IconArrowRight size={16} />
          </a>
        </div>

        {/* ---------------------------------------------------- 限时秒杀 */}
        <div className="flash">
          <div className="flash__head">
            <div className="flash__title">
              <span className="flash__pulse" />
              <h3>限时秒杀</h3>
              <span className="flash__sub">每日 10:00 / 20:00 两场</span>
            </div>

            <div className="flash__timer">
              <IconClock size={16} />
              <span className="flash__timer-label">距本场结束</span>
              <span className="flash__clock">
                <b>{h}</b>
                <i>:</i>
                <b>{m}</b>
                <i>:</i>
                <b>{s}</b>
              </span>
            </div>
          </div>

          <ul className="flash__list">
            {flashItems.map((p) => {
              const stock = FLASH_STOCK[p.id] ?? 60
              const off = Math.round((1 - p.price / p.origin) * 100)
              return (
                <li className="flash__item" key={p.id}>
                  <span className="flash__media">
                    <img src={p.image} alt={p.title} loading="lazy" />
                    <span className="flash__off">-{off}%</span>
                  </span>

                  <span className="flash__info">
                    <span className="flash__name">{p.title}</span>
                    <span className="flash__prices">
                      <b>
                        <i>¥</i>
                        {formatPrice(p.price)}
                      </b>
                      <s>¥{formatPrice(p.origin)}</s>
                    </span>
                    <span className="flash__bar">
                      <i style={{ width: `${stock}%` }} />
                      <em>已抢 {stock}%</em>
                    </span>
                  </span>

                  <button className="flash__buy" onClick={() => onAddToCart(p, p.colors[0])}>
                    马上抢
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* ------------------------------------------------------ 优惠券 */}
        <div className="coupon-block">
          <div className="coupon-block__head">
            <IconTicket size={19} />
            <h3>优惠券领取区</h3>
            <span>每种券限领 1 张，结算时自动选择最优组合</span>
          </div>

          <ul className="coupon-grid">
            {COUPONS.map((c) => {
              const isClaimed = claimed.includes(c.id)
              return (
                <li key={c.id} className={`coupon ${isClaimed ? 'is-claimed' : ''}`}>
                  <div className="coupon__left">
                    <span className="coupon__amount">
                      <i>¥</i>
                      {c.amount}
                    </span>
                    <span className="coupon__threshold">满 {c.threshold} 可用</span>
                  </div>

                  <div className="coupon__dash" aria-hidden="true" />

                  <div className="coupon__right">
                    <span className="coupon__label">{c.label}</span>
                    <span className="coupon__expire">{c.expire}</span>
                    <button className="coupon__btn" onClick={() => claim(c.id)} disabled={isClaimed}>
                      {isClaimed ? (
                        <>
                          <IconCheck size={14} />
                          已领取
                        </>
                      ) : (
                        '立即领取'
                      )}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {/* ---------------------------------------------------- 双拼活动位 */}
        <div className="promo-duo">
          <a className="promo-card promo-card--a" href="#outerwear-event">
            <img src="/img/promo-1.svg" alt="" loading="lazy" />
            <div className="promo-card__text">
              <span className="promo-card__tag">外套专场</span>
              <h3>
                冬季外套
                <em>低至 5 折</em>
              </h3>
              <p>羊毛大衣 / 双面呢 / 羽绒服，共 143 款参与</p>
              <span className="promo-card__cta">
                立即选购
                <IconArrowRight size={16} />
              </span>
            </div>
          </a>

          <a className="promo-card promo-card--b" href="#accessory-event">
            <img src="/img/promo-2.svg" alt="" loading="lazy" />
            <div className="promo-card__text">
              <span className="promo-card__tag">配饰加购</span>
              <h3>
                包袋配饰
                <em>第二件 1 元</em>
              </h3>
              <p>棒球帽、腋下包、围巾任选，同款不同色可叠加</p>
              <span className="promo-card__cta">
                去看看
                <IconArrowRight size={16} />
              </span>
            </div>
          </a>
        </div>
      </div>
    </section>
  )
}
