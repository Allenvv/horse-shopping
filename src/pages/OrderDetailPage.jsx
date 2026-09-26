import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/services'
import { useStore } from '../store/AppStore'
import { fmt2 } from '../utils/money'
import { ErrorState } from '../components/State'
import { IconArrowRight } from '../components/Icons'
import './pages.css'

/** 订单状态 → 展示文案与配色（与后端状态机保持一致） */
export const ORDER_STATUS = {
  pending_payment: { label: '待付款', tone: 'warn', hint: '请尽快完成支付，超时订单将自动关闭' },
  paid: { label: '待发货', tone: 'info', hint: '已收到你的付款，仓库正在打包' },
  shipped: { label: '待收货', tone: 'info', hint: '包裹已发出，请留意物流信息' },
  completed: { label: '已完成', tone: 'done', hint: '订单已完成，感谢你的支持' },
  cancelled: { label: '已取消', tone: 'muted', hint: '订单已取消' },
  closed: { label: '已关闭', tone: 'muted', hint: '订单超时未支付，已自动关闭' },
  refunded: { label: '已退款', tone: 'muted', hint: '退款已原路返回' },
}

/** 订单卡片：订单列表与详情页共用 */
export function OrderCard({ order, onPay, onChanged, compact = false }) {
  const status = ORDER_STATUS[order.status] || { label: order.status, tone: 'muted' }
  const [busy, setBusy] = useState(false)

  const cancel = async () => {
    setBusy(true)
    try {
      await api.cancelOrder(order.orderNo)
      onChanged?.()
    } catch {
      /* 由全局提示层负责反馈 */
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={`order-card ${compact ? 'order-card--compact' : ''}`}>
      <header className="order-card__head">
        <span className="order-card__no">订单号 {order.orderNo}</span>
        <span className="order-card__time">{new Date(order.createdAt).toLocaleString('zh-CN')}</span>
        <span className={`order-card__status is-${status.tone}`}>{status.label}</span>
      </header>

      <ul className="order-card__items">
        {order.items.map((it, i) => (
          <li key={`${it.skuId}-${i}`}>
            <img src={it.image} alt={it.title} />
            <div className="order-card__item-info">
              <p>{it.title}</p>
              <span>
                {it.color} / {it.size} × {it.qty}
              </span>
            </div>
            <b>¥{fmt2(it.subtotal)}</b>
          </li>
        ))}
      </ul>

      <div className="order-card__sums">
        <span>商品 ¥{fmt2(order.goodsAmount)}</span>
        <span>运费 {order.freight === 0 ? '包邮' : `¥${fmt2(order.freight)}`}</span>
        {order.discount > 0 && <span className="is-off">优惠 -¥{fmt2(order.discount)}</span>}
        <b>实付 ¥{fmt2(order.payable)}</b>
      </div>

      <footer className="order-card__foot">
        <p className="order-card__hint">{status.hint}</p>
        <div className="order-card__actions">
          {order.status === 'pending_payment' && (
            <>
              <button className="btn btn--ghost btn--sm" onClick={cancel} disabled={busy}>
                取消订单
              </button>
              <button className="btn btn--primary btn--sm" onClick={onPay}>
                去支付
              </button>
            </>
          )}
          {!compact && (
            <Link className="btn btn--ghost btn--sm" to={`/order/${order.orderNo}`}>
              订单详情
              <IconArrowRight size={15} />
            </Link>
          )}
        </div>
      </footer>
    </article>
  )
}

export default function OrderDetailPage() {
  const { orderNo } = useParams()
  const { setPayment } = useStore()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    setError(null)
    api.getOrder(orderNo).then(setOrder).catch(setError)
  }

  useEffect(load, [orderNo])

  if (error) {
    return (
      <div className="container page">
        <ErrorState error={error} onRetry={load} />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container page">
        <div className="skel skel--line w45" />
      </div>
    )
  }

  const status = ORDER_STATUS[order.status] || { label: order.status, tone: 'muted' }

  return (
    <div className="container page">
      <nav className="crumbs">
        <Link to="/">首页</Link>
        <span>/</span>
        <Link to="/orders">我的订单</Link>
        <span>/</span>
        <span>{order.orderNo}</span>
      </nav>

      <h1 className="page-title">
        订单详情 <span className={`order-card__status is-${status.tone}`}>{status.label}</span>
      </h1>

      <OrderCard order={order} onPay={() => setPayment({ order })} onChanged={load} />

      <section className="panel">
        <h2>收货信息</h2>
        <dl className="spec">
          <div>
            <dt>收货人</dt>
            <dd>
              {order.receiver} · {order.phone}
            </dd>
          </div>
          <div>
            <dt>收货地址</dt>
            <dd>{order.address}</dd>
          </div>
          {order.remark && (
            <div>
              <dt>买家留言</dt>
              <dd>{order.remark}</dd>
            </div>
          )}
          <div>
            <dt>下单时间</dt>
            <dd>{new Date(order.createdAt).toLocaleString('zh-CN')}</dd>
          </div>
          {order.paidAt && (
            <div>
              <dt>支付时间</dt>
              <dd>{new Date(order.paidAt).toLocaleString('zh-CN')}</dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  )
}
