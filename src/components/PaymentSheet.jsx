import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/services'
import { useStore } from '../store/AppStore'
import { fmt2 } from '../utils/money'
import { IconArrowRight, IconClock } from './Icons'
import './CheckoutSheet.css'

const POLL_MS = 2000

/** 支付弹层：选支付方式 → 展示二维码 → 轮询状态 → 成功/过期 */
export default function PaymentSheet() {
  const { payment, setPayment, pushToast, refreshCart } = useStore()
  const order = payment?.order

  const [channels, setChannels] = useState([])
  const [channel, setChannel] = useState(null)
  const [creating, setCreating] = useState(false)
  const [pay, setPay] = useState(null)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)

  const close = useCallback(() => {
    clearInterval(timerRef.current)
    setPayment(null)
    setPay(null)
    setStatus(null)
    setChannel(null)
  }, [setPayment])

  /* 拉支付方式 */
  useEffect(() => {
    if (!order) return
    api
      .getPayChannels()
      .then((list) => {
        setChannels(list)
        setChannel(list[0]?.channel)
      })
      .catch((e) => setError(e.message))
  }, [order])

  /* 拉起支付 */
  const createPay = useCallback(async () => {
    if (!order || !channel) return
    setCreating(true)
    setError(null)
    try {
      const data = await api.createPayment(order.orderNo, channel)
      setPay(data.payment)
      setStatus('created')
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }, [order, channel])

  /* 轮询支付结果 */
  useEffect(() => {
    if (!pay || status !== 'created') return undefined
    const poll = async () => {
      try {
        const s = await api.getPaymentStatus(pay.paymentNo)
        if (s.status === 'success') {
          setStatus('success')
          clearInterval(timerRef.current)
          pushToast('支付成功，我们会尽快为你发货')
          await refreshCart()
        } else if (s.status === 'expired' || s.status === 'closed' || s.status === 'failed') {
          setStatus(s.status)
          clearInterval(timerRef.current)
        }
      } catch {
        /* 轮询失败不打扰用户，下轮继续 */
      }
    }
    timerRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(timerRef.current)
  }, [pay, status, pushToast, refreshCart])

  /* 锁滚动 */
  useEffect(() => {
    if (!order) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      clearInterval(timerRef.current)
    }
  }, [order])

  if (!order) return null

  const sandbox = pay?.sandbox ?? channels.find((c) => c.channel === channel)?.sandbox

  /** 沙箱模拟支付：走与真实回调完全一致的落账路径 */
  const simulate = async () => {
    if (!pay) return
    try {
      await api.simulatePaySuccess(pay.paymentNo)
      setStatus('success')
      clearInterval(timerRef.current)
      pushToast('支付成功（沙箱模拟），订单已进入待发货')
      await refreshCart()
    } catch (err) {
      // 生产环境禁用该接口时给出明确提示
      setError(err.message)
    }
  }

  return (
    <>
      <div className="sheet-scrim is-open" onClick={close} aria-hidden="true" />
      <aside className="sheet pay-sheet" role="dialog" aria-label="支付订单">
        <header className="checkout-sheet__head pay-sheet__head">
          <h3>
            {status === 'success' ? (
              <>支付成功</>
            ) : (
              <>
                订单支付
                <span className="pay-sheet__no">{order.orderNo}</span>
              </>
            )}
          </h3>
          <button className="sheet__close" onClick={close} aria-label="关闭">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        {status === 'success' ? (
          <div className="pay-success">
            <span className="pay-success__icon">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12.5 4.5 4.5L19 7" />
              </svg>
            </span>
            <h4>付款完成</h4>
            <p className="pay-success__amount">¥{fmt2(order.payable)}</p>
            <p className="pay-success__hint">
              订单已进入待发货状态，物流单号可在「我的订单」中查看。
            </p>
            <button className="btn btn--primary" onClick={close}>
              继续逛逛
              <IconArrowRight size={17} />
            </button>
          </div>
        ) : (
          <>
            <div className="pay-amount">
              <span>需支付</span>
              <b>¥{fmt2(order.payable)}</b>
            </div>

            {/* 支付方式 */}
            <div className="pay-channels">
              {channels.map((c) => (
                <button
                  key={c.channel}
                  className={`pay-channel ${channel === c.channel ? 'is-active' : ''}`}
                  onClick={() => {
                    setChannel(c.channel)
                    setPay(null)
                    setStatus(null)
                  }}
                >
                  <span className={`pay-channel__logo pay-channel__logo--${c.channel}`}>
                    {c.channel === 'wechat' ? '微' : '支'}
                  </span>
                  <span className="pay-channel__txt">
                    {c.name}
                    <em>{c.desc}</em>
                  </span>
                  {c.sandbox && <span className="pay-channel__tag">沙箱</span>}
                  <span className={`pay-channel__radio ${channel === c.channel ? 'is-on' : ''}`} />
                </button>
              ))}
            </div>

            {/* 二维码 */}
            {pay ? (
              <div className="pay-qr">
                <img src={pay.qrDataUrl} alt={`${channel === 'wechat' ? '微信' : '支付宝'}支付二维码`} />
                <p className="pay-qr__hint">
                  <IconClock size={15} />
                  请使用{channel === 'wechat' ? '微信' : '支付宝'}扫一扫完成付款，5 分钟内有效
                </p>
                <p className="pay-qr__status">
                  {status === 'created' && '等待支付结果…'}
                  {status === 'expired' && '二维码已过期，请重新发起支付'}
                  {status === 'closed' && '支付已关闭'}
                  {status === 'failed' && '支付失败，请重新发起'}
                </p>
                {(status === 'expired' || status === 'closed' || status === 'failed') && (
                  <button className="btn btn--ghost btn--sm" onClick={createPay}>
                    重新发起支付
                  </button>
                )}
              </div>
            ) : (
              <button
                className="btn btn--primary pay-sheet__go"
                onClick={createPay}
                disabled={!channel || creating}
              >
                {creating ? '正在拉起支付…' : `使用${channels.find((c) => c.channel === channel)?.name || '支付'}付款`}
                <IconArrowRight size={17} />
              </button>
            )}

            {sandbox && pay && (
              <div className="pay-sandbox">
                <p>
                  当前为沙箱模式（未配置商户凭证）。点击下面的按钮即可模拟渠道回调，
                  走与真实回调完全相同的落账路径。
                </p>
                <button className="btn btn--ghost btn--sm" onClick={simulate}>
                  模拟支付成功
                </button>
              </div>
            )}

            {error && <p className="checkout-error">{error}</p>}

            <p className="pay-tip">
              支付由{channels.find((c) => c.channel === channel)?.name || '第三方'}提供，本页不会产生真实扣款（沙箱模式）
            </p>
          </>
        )}
      </aside>
    </>
  )
}
