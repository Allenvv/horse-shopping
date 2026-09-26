import { Link } from 'react-router-dom'
import { IconArrowRight } from '../components/Icons'
import './pages.css'

export default function NotFoundPage() {
  return (
    <div className="container page">
      <div className="page-empty">
        <span className="page-empty__code">404</span>
        <h1>这个页面走丢了</h1>
        <p>你访问的链接可能已失效，或者商品已经下架。</p>
        <Link className="btn btn--primary" to="/">
          回到首页
          <IconArrowRight size={17} />
        </Link>
      </div>
    </div>
  )
}
