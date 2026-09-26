import { Link } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { useRequest } from '../hooks/useRequest'
import { api } from '../api/services'
import { num } from '../utils/money'
import { IconArrowRight, IconHeart, IconTicket, IconTruck, IconUser } from '../components/Icons'
import './pages.css'

const ENTRIES = [
  { to: '/orders', label: '全部订单', desc: '查看物流与状态', icon: IconTruck },
  { to: '/orders', label: '待付款', desc: '继续完成支付', icon: IconTicket, filter: 'pending_payment' },
  { to: '/coupons', label: '优惠券', desc: '领取与查看券包', icon: IconTicket },
  { to: '/list', label: '我的收藏', desc: '心动单品收藏夹', icon: IconHeart },
]

export default function MinePage() {
  const { cart, token } = useStore()
  const { data: orders } = useRequest(() => api.listOrders(), [])
  const { data: coupons } = useRequest(() => api.getMyCoupons(), [])

  const stats = [
    { label: '购物车', value: cart?.count || 0, to: '/cart' },
    { label: '订单', value: orders?.list?.length || 0, to: '/orders' },
    { label: '优惠券', value: coupons?.length || 0, to: '/coupons' },
  ]

  return (
    <div className="container page">
      {/* 用户卡片 */}
      <section className="profile">
        <span className="profile__avatar">
          <IconUser size={26} />
        </span>
        <div className="profile__info">
          <h1>访客用户</h1>
          <p>
            当前为匿名会话 · 标识 {token?.slice(0, 14)}…
            <br />
            接入登录后，此处展示昵称、会员等级与积分。
          </p>
        </div>
      </section>

      {/* 数据概览 */}
      <ul className="stat-row">
        {stats.map((s) => (
          <li key={s.label}>
            <Link to={s.to}>
              <b>{num(s.value)}</b>
              <span>{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* 功能入口 */}
      <ul className="entry-list">
        {ENTRIES.map((e) => (
          <li key={e.label}>
            <Link to={e.to}>
              <span className="entry-list__icon">
                <e.icon size={19} />
              </span>
              <span className="entry-list__text">
                <b>{e.label}</b>
                <em>{e.desc}</em>
              </span>
              <IconArrowRight size={17} />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mine-tip">
        这是演示环境：支付走沙箱模式，不会产生真实扣款。收货地址在结算页保存后会自动记住。
      </p>
    </div>
  )
}
