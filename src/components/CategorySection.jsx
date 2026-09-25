import { useState } from 'react'
import { CATEGORIES } from '../data/catalog'
import { IconArrowRight } from './Icons'
import './CategorySection.css'

export default function CategorySection() {
  const [active, setActive] = useState(null)

  return (
    <section className="section" id="categories">
      <div className="container">
        <div className="section-head">
          <div className="section-head__left">
            <span className="section-head__eyebrow">Shop by category</span>
            <h2 className="section-head__title">按品类挑选你的下一件</h2>
            <p className="section-head__desc">
              从基础款到设计师单品，八大品类覆盖日常通勤、街头与正式场合。
            </p>
          </div>
          <a className="section-head__action" href="#all-categories">
            查看全部品类
            <IconArrowRight size={16} />
          </a>
        </div>

        <ul className="cat-grid">
          {CATEGORIES.map((cat, i) => (
            <li key={cat.id} style={{ '--delay': `${i * 45}ms` }}>
              <a
                className={`cat-card ${active === cat.id ? 'is-active' : ''}`}
                href={`#cat-${cat.id}`}
                onMouseEnter={() => setActive(cat.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(cat.id)}
                onBlur={() => setActive(null)}
              >
                <span className="cat-card__media">
                  <img src={cat.image} alt={cat.name} loading="lazy" />
                </span>
                <span className="cat-card__body">
                  <span className="cat-card__name">{cat.name}</span>
                  <span className="cat-card__en">{cat.en}</span>
                </span>
                <span className="cat-card__count">{cat.count} 件</span>
                <span className="cat-card__arrow" aria-hidden="true">
                  <IconArrowRight size={15} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
