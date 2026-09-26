import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../api/services'
import ProductCard from '../components/ProductCard'
import { SkeletonGrid, ErrorState, EmptyState } from '../components/State'
import { IconClose, IconSearch } from '../components/Icons'
import './pages.css'

const SORTS = [
  { id: 'default', label: '综合推荐' },
  { id: 'hot', label: '销量优先' },
  { id: 'new', label: '最新上架' },
  { id: 'price_asc', label: '价格 ↑' },
  { id: 'price_desc', label: '价格 ↓' },
  { id: 'rating', label: '好评优先' },
]

/** 价格区间（分） */
const PRICE_BANDS = [
  { id: '', label: '全部价格' },
  { id: '0-20000', label: '¥200 以下' },
  { id: '20000-50000', label: '¥200-500' },
  { id: '50000-100000', label: '¥500-1000' },
  { id: '100000-', label: '¥1000 以上' },
]

const PAGE_SIZE = 12

export default function ListPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const category = params.get('category') || ''
  const q = params.get('q') || ''
  const sort = params.get('sort') || 'default'
  const band = params.get('price') || ''

  const [categories, setCategories] = useState([])
  const [keyword, setKeyword] = useState(q)
  const [list, setList] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const seq = useRef(0)

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => setKeyword(q), [q])

  /* 筛选条件变化 → 回到第一页 */
  useEffect(() => setPage(1), [category, q, sort, band])

  useEffect(() => {
    const id = ++seq.current
    setLoading(true)
    setError(null)
    const [minPrice, maxPrice] = band ? band.split('-') : ['', '']

    api
      .listProducts({
        category, q, sort, page, pageSize: PAGE_SIZE,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
      })
      .then((data) => {
        if (id !== seq.current) return
        setMeta(data.pagination)
        setList((prev) => (page === 1 ? data.list : [...prev, ...data.list]))
      })
      .catch((err) => id === seq.current && setError(err))
      .finally(() => id === seq.current && setLoading(false))
  }, [category, q, sort, band, page])

  const patch = (obj) => {
    const next = new URLSearchParams(params)
    Object.entries(obj).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next)
  }

  const currentCategory = useMemo(
    () => categories.find((c) => c.slug === category),
    [categories, category]
  )

  const hasMore = meta ? meta.page < meta.totalPages : false

  return (
    <div className="container page">
      {/* 页头 */}
      <header className="list-head">
        <nav className="crumbs" aria-label="面包屑">
          <button onClick={() => navigate('/')}>首页</button>
          <span>/</span>
          <span>{currentCategory ? currentCategory.name : '全部商品'}</span>
        </nav>
        <h1 className="list-head__title">
          {q ? `“${q}” 的搜索结果` : currentCategory ? currentCategory.name : '全部商品'}
        </h1>
        {meta && <p className="list-head__count">共 {meta.total} 件商品</p>}
      </header>

      {/* 搜索框 */}
      <form
        className="list-search"
        onSubmit={(e) => {
          e.preventDefault()
          patch({ q: keyword.trim() })
        }}
      >
        <IconSearch size={18} />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索单品、品类或面料…"
          aria-label="搜索商品"
        />
        {keyword && (
          <button
            type="button"
            className="list-search__clear"
            onClick={() => {
              setKeyword('')
              patch({ q: '' })
            }}
            aria-label="清空"
          >
            <IconClose size={16} />
          </button>
        )}
        <button className="btn btn--primary btn--sm" type="submit">
          搜索
        </button>
      </form>

      {/* 筛选栏 */}
      <div className="filters">
        <div className="filters__row">
          <span className="filters__label">品类</span>
          <div className="filters__chips">
            <button
              className={`chip ${!category ? 'is-active' : ''}`}
              onClick={() => patch({ category: '' })}
            >
              全部
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                className={`chip ${category === c.slug ? 'is-active' : ''}`}
                onClick={() => patch({ category: c.slug })}
              >
                {c.name}
                <em>{c.productCount}</em>
              </button>
            ))}
          </div>
        </div>

        <div className="filters__row">
          <span className="filters__label">价格</span>
          <div className="filters__chips">
            {PRICE_BANDS.map((b) => (
              <button
                key={b.id || 'all'}
                className={`chip ${band === b.id ? 'is-active' : ''}`}
                onClick={() => patch({ price: b.id })}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filters__row">
          <span className="filters__label">排序</span>
          <div className="filters__chips">
            {SORTS.map((s) => (
              <button
                key={s.id}
                className={`chip ${sort === s.id ? 'is-active' : ''}`}
                onClick={() => patch({ sort: s.id })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 结果 */}
      {error && <ErrorState error={error} onRetry={() => setPage(page)} />}

      {loading && list.length === 0 && <SkeletonGrid count={PAGE_SIZE} />}

      {!loading && !error && list.length === 0 && (
        <EmptyState
          text={q ? `没有找到与“${q}”相关的商品` : '该条件下暂无在售商品'}
          hint="试试调整筛选条件或更换关键词"
        />
      )}

      {list.length > 0 && (
        <div className="list-grid">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <div className="list-more">
        {hasMore ? (
          <button className="btn btn--ghost" onClick={() => setPage((p) => p + 1)} disabled={loading}>
            {loading ? '加载中…' : '加载更多'}
          </button>
        ) : (
          list.length > 0 && <span className="list-more__end">已展示全部 {meta?.total} 件商品</span>
        )}
      </div>
    </div>
  )
}
