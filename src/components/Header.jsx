import { useEffect, useRef, useState } from 'react'
import { NAV } from '../data/catalog'
import {
  IconCart,
  IconClose,
  IconHeart,
  IconMenu,
  IconSearch,
  IconUser,
} from './Icons'
import './Header.css'

const NOTICES = [
  '新客首单立减 80 元，注册即领',
  '全场满 599 元包顺丰，48 小时内发货',
  '会员日每月 25 日，满 599 减 120 可叠加',
]

export default function Header({ cartCount, onOpenCart }) {
  const [scrolled, setScrolled] = useState(false)
  const [noticeIndex, setNoticeIndex] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeNav, setActiveNav] = useState(NAV[0].label)
  const searchRef = useRef(null)

  /* 滚动后收窄头部 */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* 顶部公告轮播 */
  useEffect(() => {
    const t = setInterval(() => setNoticeIndex((i) => (i + 1) % NOTICES.length), 4200)
    return () => clearInterval(t)
  }, [])

  /* 展开搜索时自动聚焦 */
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  return (
    <>
      <div className="notice">
        <div className="container notice__inner">
          <span className="notice__dot" />
          <span key={noticeIndex} className="notice__text">
            {NOTICES[noticeIndex]}
          </span>
          <a className="notice__link" href="#coupon">
            立即领取
          </a>
        </div>
      </div>

      <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
        <div className="container header__inner">
          <button
            className="header__burger"
            onClick={() => setMenuOpen(true)}
            aria-label="打开菜单"
          >
            <IconMenu size={22} />
          </button>

          <a className="brand" href="#top" aria-label="潮野 CHAOYE 首页">
            <span className="brand__mark" aria-hidden="true">
              <svg viewBox="0 0 48 48" width="38" height="38">
                <rect width="48" height="48" rx="12" fill="#16130F" />
                <path
                  d="M14 34 L24 14 L34 34"
                  fill="none"
                  stroke="#FBFAF7"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19.5 27 H28.5"
                  fill="none"
                  stroke="#E8502F"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="brand__text">
              <b>潮野</b>
              <i>CHAOYE</i>
            </span>
          </a>

          <nav className={`nav ${menuOpen ? 'nav--open' : ''}`}>
            <div className="nav__mobile-head">
              <span>全部品类</span>
              <button onClick={() => setMenuOpen(false)} aria-label="关闭菜单">
                <IconClose size={20} />
              </button>
            </div>
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`nav__link ${activeNav === item.label ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveNav(item.label)
                  setMenuOpen(false)
                }}
              >
                {item.label}
                {item.hot && <span className="nav__hot">HOT</span>}
              </a>
            ))}
          </nav>

          <div className="header__actions">
            <div className={`search ${searchOpen ? 'search--open' : ''}`}>
              <input
                ref={searchRef}
                className="search__input"
                placeholder="搜索单品、品类或风格…"
                onBlur={() => setSearchOpen(false)}
                onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
              />
              <button
                className="search__btn"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="搜索"
              >
                <IconSearch size={19} />
              </button>
            </div>

            <button className="icon-btn icon-btn--hide-sm" aria-label="我的收藏">
              <IconHeart size={20} />
            </button>
            <button className="icon-btn icon-btn--hide-sm" aria-label="账户">
              <IconUser size={20} />
            </button>
            <button className="icon-btn" onClick={onOpenCart} aria-label={`购物车，${cartCount} 件`}>
              <IconCart size={20} />
              {cartCount > 0 && <span className="icon-btn__badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && <div className="nav-scrim" onClick={() => setMenuOpen(false)} />}
    </>
  )
}
