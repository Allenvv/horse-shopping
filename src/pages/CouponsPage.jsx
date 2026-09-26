import { useState } from 'react'
import { useRequest } from '../hooks/useRequest'
import { api } from '../api/services'
import { useStore } from '../store/AppStore'
import { fmt } from '../utils/money'
import { ErrorState } from '../components/State'
import { IconCheck, IconTicket } from '../components/Icons'
import './pages.css'

export default function CouponsPage() {
  const { pushToast } = useStore()
  const { data: all, loading, error, refresh } = useRequest(() => api.getCoupons(), [])
  const { data: mine, refresh: refreshMine } = useRequest(() => api.getMyCoupons(), [])
  const [claiming, setClaiming] = useState(null)

  const claimedCodes = new Set((mine || []).map((c) => c.code))

  const claim = async (code) => {
    setClaiming(code)
    try {
      const data = await api.claimCoupon(code)
      pushToast(`已领取「${data.title}」`)
      refresh()
      refreshMine()
    } catch (err) {
      pushToast(err.message, 'error')
    } finally {
      setClaiming(null)
    }
  }

  return (
    <div className="container page">
      <h1 className="page-title">优惠券中心</h1>
      <p className="page-sub">领取后在结算页自动可选，每种券限领 1 张。</p>

      {error && <ErrorState error={error} onRetry={refresh} />}

      <ul className="coupon-wall">
        {loading
          ? Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="coupon-ticket coupon-ticket--skeleton" />
            ))
          : (all || []).map((c) => {
              const claimed = claimedCodes.has(c.code)
              return (
                <li key={c.code} className={`coupon-ticket ${claimed || c.soldOut ? 'is-used' : ''}`}>
                  <div className="coupon-ticket__left">
                    <span className="coupon-ticket__amount">
                      <i>¥</i>
                      {fmt(c.amount)}
                    </span>
                    <span className="coupon-ticket__threshold">满 {fmt(c.threshold)} 可用</span>
                  </div>
                  <div className="coupon-ticket__dash" aria-hidden="true" />
                  <div className="coupon-ticket__right">
                    <h3>{c.title}</h3>
                    <p>
                      {c.scope === 'newuser'
                        ? '仅限首单使用'
                        : c.scope.startsWith('category:')
                        ? '仅限指定品类'
                        : '全场通用'}
                      {' · '}领取后 {c.expireDays} 天内有效
                    </p>
                    <div className="coupon-ticket__foot">
                      <span className="coupon-ticket__left-num">剩余 {c.remaining} 张</span>
                      <button
                        className="coupon-ticket__btn"
                        onClick={() => claim(c.code)}
                        disabled={claimed || c.soldOut || claiming === c.code}
                      >
                        {claimed ? (
                          <>
                            <IconCheck size={14} /> 已领取
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
                  </div>
                </li>
              )
            })}
      </ul>

      {(mine || []).length > 0 && (
        <>
          <h2 className="section-title">
            <IconTicket size={18} /> 我的券包
          </h2>
          <ul className="coupon-wall">
            {mine.map((c) => (
              <li key={c.code} className={`coupon-ticket ${c.holdStatus !== 'unused' ? 'is-used' : ''}`}>
                <div className="coupon-ticket__left">
                  <span className="coupon-ticket__amount">
                    <i>¥</i>
                    {fmt(c.amount)}
                  </span>
                  <span className="coupon-ticket__threshold">满 {fmt(c.threshold)} 可用</span>
                </div>
                <div className="coupon-ticket__dash" aria-hidden="true" />
                <div className="coupon-ticket__right">
                  <h3>{c.title}</h3>
                  <p>{c.holdStatus === 'unused' ? '待使用' : '已使用'} · 有效期 {c.expireDays} 天</p>
                  <div className="coupon-ticket__foot">
                    <span className="coupon-ticket__left-num">结算时可选用</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
