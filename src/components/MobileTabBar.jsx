import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TAB_BAR } from '../data/nav'
import { useStore } from '../store/AppStore'
import './MobileTabBar.css'

const ICONS = {
  home: <path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  categories: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2.2l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L20.5 8H6" />
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="17.5" cy="20" r="1.4" />
    </>
  ),
  coupon: (
    <>
      <path d="M3.5 8.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v1.6a2 2 0 0 0 0 3.8v1.6a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-1.6a2 2 0 0 0 0-3.8z" />
      <path d="M14 7v10" strokeDasharray="2 2.6" />
    </>
  ),
  me: (
    <>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6" />
    </>
  ),
}

export default function MobileTabBar() {
  const { cart } = useStore()
  const navigate = useNavigate()
  const [active, setActive] = useState('home')

  return (
    <nav
      className="tabbar"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="底部导航"
    >
      {TAB_BAR.map((tab) => (
        <button
          key={tab.id}
          className={`tabbar__item ${active === tab.id ? 'is-active' : ''}`}
          onClick={() => {
            setActive(tab.id)
            navigate(tab.href)
          }}
        >
          <span className="tabbar__icon">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[tab.id]}
            </svg>
            {tab.id === 'cart' && cart?.count > 0 && (
              <span className="tabbar__badge">{cart.count}</span>
            )}
          </span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
