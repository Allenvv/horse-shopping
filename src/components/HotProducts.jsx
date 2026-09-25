import { useMemo, useState } from 'react'
import { PRODUCTS, PRODUCT_TABS } from '../data/catalog'
import ProductCard from './ProductCard'
import { IconArrowRight, IconRefresh } from './Icons'
import './HotProducts.css'

const SORTS = [
  { id: 'default', label: '综合推荐' },
  { id: 'sold', label: '销量优先' },
  { id: 'priceAsc', label: '价格从低到高' },
  { id: 'priceDesc', label: '价格从高到低' },
]

const PAGE_SIZE = 8

export default function HotProducts({ onAddToCart }) {
  const [tab, setTab] = useState('all')
  const [sort, setSort] = useState('default')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const list = PRODUCTS.filter((p) => {
      if (tab === 'all') return true
      if (tab === 'bag') return p.category === 'bag' || p.category === 'cap'
      return p.category === tab
    })

    const sorted = [...list]
    if (sort === 'sold') sorted.sort((a, b) => b.sold - a.sold)
    if (sort === 'priceAsc') sorted.sort((a, b) => a.price - b.price)
    if (sort === 'priceDesc') sorted.sort((a, b) => b.price - a.price)
    return sorted
  }, [tab, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = page % totalPages
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const switchTab = (id) => {
    setTab(id)
    setPage(0)
  }

  return (
    <section className="section hot" id="hot">
      <div className="container">
        <div className="section-head">
          <div className="section-head__left">
            <span className="section-head__eyebrow">Best sellers</span>
            <h2 className="section-head__title">本周热门单品</h2>
            <p className="section-head__desc">
              根据近 7 天真实成交与收藏数据排序，每 24 小时更新一次。
            </p>
          </div>
          <button className="section-head__action" onClick={() => setPage((p) => p + 1)}>
            换一批看看
            <IconRefresh size={16} />
          </button>
        </div>

        <div className="hot__bar">
          <div className="hot__tabs" role="tablist" aria-label="商品分类筛选">
            {PRODUCT_TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`chip ${tab === t.id ? 'is-active' : ''}`}
                onClick={() => switchTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="hot__sorts">
            {SORTS.map((s) => (
              <button
                key={s.id}
                className={`sort ${sort === s.id ? 'is-active' : ''}`}
                onClick={() => setSort(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {visible.length > 0 ? (
          <div className="hot__grid" key={`${tab}-${sort}-${safePage}`}>
            {visible.map((p, i) => (
              <div className="hot__item" style={{ '--delay': `${i * 55}ms` }} key={p.id}>
                <ProductCard product={p} onAddToCart={onAddToCart} />
              </div>
            ))}
          </div>
        ) : (
          <p className="hot__empty">该分类暂无在售商品，换个分类看看吧。</p>
        )}

        <div className="hot__more">
          <a className="btn btn--ghost" href="#all-products">
            浏览全部商品
            <IconArrowRight size={17} />
          </a>
        </div>
      </div>
    </section>
  )
}
