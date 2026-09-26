import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/services'
import { useStore } from '../store/AppStore'
import { fmt2 } from '../utils/money'
import { EmptyState, ErrorState } from '../components/State'
import { IconArrowRight } from '../components/Icons'
import { ORDER_STATUS, OrderCard } from './OrderDetailPage'
import './pages.css'

const TABS = [
  { id: '', label: '全部' },
  { id: 'pending_payment', label: '待付款' },
  { id: 'paid', label: '待发货' },
  { id: 'shipped', label: '待收货' },
  { id: 'completed', label: '已完成' },
]

export default function OrdersPage() {
  const { setPayment } = useStore()
  const [tab, setTab] = useState('')
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    setError(null)
    api
      .listOrders()
      .then((d) => setOrders(d.list))
      .catch(setError)
  }

  useEffect(load, [])

  const list = (orders || []).filter((o) => !tab || o.status === tab)

  return (
    <div className="container page">
      <h1 className="page-title">我的订单</h1>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id || 'all'}
            className={`chip ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <ErrorState error={error} onRetry={load} />}

      {orders && list.length === 0 && (
        <EmptyState
          text={tab ? `没有${TABS.find((t) => t.id === tab)?.label}的订单` : '还没有订单'}
          hint="下单后可以在这里查看物流与状态"
          action={
            <Link className="btn btn--primary" to="/list">
              去逛逛
              <IconArrowRight size={17} />
            </Link>
          }
        />
      )}

      <ul className="order-list">
        {list.map((o) => (
          <li key={o.orderNo}>
            <OrderCard order={o} onPay={() => setPayment({ order: o })} onChanged={load} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export { ORDER_STATUS }
