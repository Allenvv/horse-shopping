import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../../api/services'
import { useStore } from '../../../store/AppStore'
import { useRequest } from '../../../hooks/useRequest'
import { fmt, fmt2 } from '../../../utils/money'
import { ErrorState } from '../../../components/State'
import { IconArrowRight, IconCheck, IconClock, IconTicket } from '../../../components/Icons'
import './PromoSection.css'

const pad = (n) => String(Math.max(0, n)).padStart(2, '0')

/**
 * 倒计时：以服务端结束时间为准，并校准本地时钟偏移，
 * 避免用户改系统时间或时区不同导致进度错乱。
 */
function useCountdown(endAt, serverTime) {
  const skewRef = useRef(0)
  const end = endAt ? new Date(endAt).getTime() : 0
  const [left, setLeft] = useState(() => Math.max(0, end - (Date.now() + skewRef.current)))

  useEffect(() => {
    if (serverTime) skewRef.current = new Date(serverTime).getTime() - Date.now()
  }, [serverTime])

  useEffect(() => {
    if (!end) return undefined
    const tick = () => setLeft(Math.max(0, end - (Date.now() + skewRef.current)))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [end])

  return useMemo(() => {
    const total = Math.floor(left / 1000)
    return {
      h: pad(Math.floor(total / 3600)),
      m: pad(Math.floor((total % 3600) / 60)),
      s: pad(total % 60),
      ended: left <= 0,
    }
  }, [left])
}

export default function PromoSection() {
  const { openSkuPicker, pushToast } = useStore()
  const { data: sale, loading, error, refresh } = useRequest(() => api.getFlashSale(), [])
  const { data: coupons } = useRequest(() => api.getCoupons(), [])
  const [claimed, setClaimed] = useState([])
  const [claiming, setClaiming] = useState(null)

  const { h, m, s, ended } = useCountdown(sale?.endAt, sale?.serverTime)

  /** 领取优惠券：状态来自服务端，避免前端假象 */
  const claim = async (code) => {
    if (claiming) return
    setClaiming(code)
    try {
      const data = await api.claimCoupon(code)
      setClaimed((prev) => [...prev, code])
      pushToast(`已领取「${data.title}」`)
    } catch (err) {
      pushToast(err.message, 'error')
    } finally {
      setClaiming(null)
    }
  }

  /** 秒杀商品加入购物车：先选款式，价格以购物车接口为准 */
  const buyFlash = (item) => {
    openSkuPicker({
      id: item.product.id,
      title: item.product.title,
      image: item.product.image,
      price: item.flashPrice,
      originPrice: item.product.originPrice,
      sales: 0,
      rating: null,
      colors: [],
      flashPrice: item.flashPrice,
    })
  }

  return (
    <section className="section promo" id="coupon">
      <div className="container">
        <div className="section-head">
          <div className="section-head__left">
            <span className="section-head__eyebrow">Limited offers</span>
            <h2 className="section-head__title">今日活动 · 限时开抢</h2>
            <p className="section-head__desc">
              每日 10:00 / 20:00 两场，优惠券可与秒杀价叠加使用。
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------- 限时秒杀 */}
        {error && <ErrorState error={error} onRetry={refresh} />}

        {!error && (
          <div className="flash">
            <div className="flash__head">
              <div className="flash__title">
                <span className="flash__pulse" />
                <h3>{sale?.title || '限时秒杀'}</h3>
                <span className="flash__sub">
                  {ended ? '本场已结束，下场 10:00 开启' : '整点开抢 · 售完即止'}
                </span>
              </div>

              <div className="flash__timer">
                <IconClock size={16} />
                <span className="flash__timer-label">{ended ? '距下场开始' : '距本场结束'}</span>
                <span className="flash__clock">
                  <b>{h}</b>
                  <i>:</i>
                  <b>{m}</b>
                  <i>:</i>
                  <b>{s}</b>
                </span>
              </div>
            </div>

            {loading ? (
              <ul className="flash__list">
                {Array.from({ length: 3 }, (_, i) => (
                  <li className="flash__item flash__item--skeleton" key={i} />
                ))}
              </ul>
            ) : (
              <ul className="flash__list">
                {(sale?.items || []).map((it) => (
                  <li className="flash__item" key={it.flashItemId}>
                    <span className="flash__media">
                      <img src={it.product.image} alt={it.product.title} loading="lazy" />
                      <span className="flash__off">-{it.offPercent}%</span>
                    </span>

                    <span className="flash__info">
                      <span className="flash__name">{it.product.title}</span>
                      <span className="flash__prices">
                        <b>
                          <i>¥</i>
                          {fmt(it.flashPrice)}
                        </b>
                        <s>¥{fmt(it.product.originPrice)}</s>
                      </span>
                      <span className="flash__bar">
                        <i style={{ width: `${it.claimedPercent}%` }} />
                        <em>
                          {it.remaining === 0 ? '已抢完' : `已抢 ${it.claimedPercent}% · 剩 ${it.remaining} 件`}
                        </em>
                      </span>
                    </span>

                    <button
                      className="flash__buy"
                      onClick={() => buyFlash(it)}
                      disabled={it.remaining === 0 || ended}
                    >
                      {it.remaining === 0 ? '已抢完' : '马上抢'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ------------------------------------------------------ 优惠券 */}
        <div className="coupon-block">
          <div className="coupon-block__head">
            <IconTicket size={19} />
            <h3>优惠券领取区</h3>
            <span>每种券限领 1 张，结算时自动选择最优组合</span>
          </div>

          <ul className="coupon-grid">
            {(coupons || []).map((c) => {
              const isClaimed = claimed.includes(c.code)
              return (
                <li key={c.code} className={`coupon ${isClaimed || c.soldOut ? 'is-claimed' : ''}`}>
                  <div className="coupon__left">
                    <span className="coupon__amount">
                      <i>¥</i>
                      {fmt(c.amount)}
                    </span>
                    <span className="coupon__threshold">满 {fmt(c.threshold)} 可用</span>
                  </div>

                  <div className="coupon__dash" aria-hidden="true" />

                  <div className="coupon__right">
                    <span className="coupon__label">{c.title}</span>
                    <span className="coupon__expire">
                      领取后 {c.expireDays} 天内有效 · 剩 {c.remaining} 张
                    </span>
                    <button
                      className="coupon__btn"
                      onClick={() => claim(c.code)}
                      disabled={isClaimed || c.soldOut || claiming === c.code}
                    >
                      {isClaimed ? (
                        <>
                          <IconCheck size={14} />
                          已领取
                        </>
                      ) : c.soldOut ? (
                        '已领完'
                      ) : claiming === c.code ? (
                        '领取中…'
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
          <a className="promo-card promo-card--a" href="#/list?category=outerwear">
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

          <a className="promo-card promo-card--b" href="#/list?category=bags">
            <img src="/img/promo-2.svg" alt="" loading="lazy" />
            <div className="promo-card__text">
              <span className="promo-card__tag">配饰加购</span>
              <h3>
                包袋配饰
                <em>第二件 1 元</em>
              </h3>
              <p>棒球帽、腋下包、帆布包任选，同款不同色可叠加</p>
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
