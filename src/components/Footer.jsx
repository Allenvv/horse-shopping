import { useState } from 'react'
import { FOOTER_LINKS } from '../data/catalog'
import { IconArrowRight, IconCheck, IconHeart } from './Icons'
import './Footer.css'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const subscribe = (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return
    setSubscribed(true)
    setEmail('')
  }

  return (
    <footer className="footer" id="footer">
      <div className="container">
        {/* 订阅区 */}
        <div className="footer__top">
          <div className="footer__brand">
            <span className="footer__mark" aria-hidden="true">
              <svg viewBox="0 0 48 48" width="42" height="42">
                <rect width="48" height="48" rx="12" fill="#FBFAF7" />
                <path
                  d="M14 34 L24 14 L34 34"
                  fill="none"
                  stroke="#16130F"
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
            <div>
              <h2>潮野 CHAOYE</h2>
              <p>
                创立于 2019 年，专注为都市青年提供质感与廓形兼备的日常衣着。
                我们相信好衣服不需要理由，只需要穿上去的那一刻。
              </p>
            </div>
          </div>

          <form className="subscribe" onSubmit={subscribe}>
            <label htmlFor="subscribe-email">订阅新季上新与独家折扣</label>
            <div className={`subscribe__field ${subscribed ? 'is-done' : ''}`}>
              <input
                id="subscribe-email"
                type="email"
                placeholder="输入你的邮箱地址"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setSubscribed(false)
                }}
                required
              />
              <button type="submit" aria-label="订阅">
                {subscribed ? <IconCheck size={18} /> : <IconArrowRight size={18} />}
              </button>
            </div>
            <span className="subscribe__hint">
              {subscribed ? '订阅成功，新季lookbook将发送到你的邮箱' : '我们每月最多发 2 封，随时可退订'}
            </span>
          </form>
        </div>

        {/* 链接区 */}
        <div className="footer__main">
          <nav className="footer__links" aria-label="页脚导航">
            {FOOTER_LINKS.map((col) => (
              <div className="footer__col" key={col.title}>
                <h3>{col.title}</h3>
                <ul>
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href={`#${l}`}>{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="footer__contact">
            <h3>联系我们</h3>
            <p className="footer__phone">400-820-1996</p>
            <p className="footer__time">客服时间 09:00 - 22:00（含节假日）</p>
            <p className="footer__mail">service@chaoye.example.com</p>
            <div className="footer__social">
              {['微博', '小红书', '抖音', '微信公众号'].map((s) => (
                <a key={s} href={`#${s}`} className="footer__social-item">
                  {s}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* 版权区 */}
        <div className="footer__bottom">
          <p>© 2026 潮野 CHAOYE. 保留所有权利。本站为演示项目，商品与价格均为示例数据。</p>
          <div className="footer__legal">
            <a href="#privacy">隐私政策</a>
            <a href="#terms">服务条款</a>
            <a href="#icp">沪ICP备 0000000 号</a>
          </div>
          <p className="footer__made">
            Made with <IconHeart size={13} /> in Shanghai
          </p>
        </div>
      </div>
    </footer>
  )
}
