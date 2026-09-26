import { useRequest } from '../../../hooks/useRequest'
import { api } from '../../../api/services'
import { ErrorState } from '../../../components/State'
import { IconArrowRight } from '../../../components/Icons'
import './CategorySection.css'

export default function CategorySection({ onPick }) {
  const { data: categories, loading, error, refresh } = useRequest(() => api.getCategories(), [])

  if (error) {
    return (
      <section className="section" id="categories">
        <div className="container">
          <ErrorState error={error} onRetry={refresh} />
        </div>
      </section>
    )
  }

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
          <button className="section-head__action" onClick={() => onPick?.('all')}>
            查看全部品类
            <IconArrowRight size={16} />
          </button>
        </div>

        <ul className="cat-grid">
          {loading
            ? Array.from({ length: 8 }, (_, i) => (
                <li key={i}>
                  <div className="cat-card cat-card--skeleton">
                    <span className="cat-card__media skel-media" />
                    <span className="skel-line" />
                  </div>
                </li>
              ))
            : categories.map((cat) => (
                <li key={cat.slug}>
                  <button className="cat-card" onClick={() => onPick?.(cat.slug)}>
                    <span className="cat-card__media">
                      <img src={cat.image} alt={cat.name} loading="lazy" />
                    </span>
                    <span className="cat-card__body">
                      <span className="cat-card__name">{cat.name}</span>
                      <span className="cat-card__en">{cat.enName}</span>
                    </span>
                    <span className="cat-card__count">{cat.productCount} 件在售</span>
                    <span className="cat-card__arrow" aria-hidden="true">
                      <IconArrowRight size={15} />
                    </span>
                  </button>
                </li>
              ))}
        </ul>
      </div>
    </section>
  )
}
