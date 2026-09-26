import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../../api/services'
import ProductCard from '../../../components/ProductCard'
import { SkeletonGrid, ErrorState, EmptyState } from '../../../components/State'
import { IconArrowRight } from '../../../components/Icons'
import './HotProducts.css'

const TABS = [
  { id: 'all', slug: '', label: '全部热门' },
  { id: 'tops', slug: 'tops', label: '上衣卫衣' },
  { id: 'outerwear', slug: 'outerwear', label: '外套大衣' },
  { id: 'trousers', slug: 'trousers', label: '裤装' },
  { id: 'dresses', slug: 'dresses', label: '裙装' },
  { id: 'footwear', slug: 'footwear', label: '鞋履' },
  { id: 'bags', slug: 'bags', label: '包袋配饰' },
]

const SORTS = [
  { id: 'default', label: '综合推荐' },
  { id: 'hot', label: '销量优先' },
  { id: 'new', label: '最新上架' },
  { id: 'price_asc', label: '价格从低到高' },
  { id: 'price_desc', label: '价格从高到低' },
]

const PAGE_SIZE = 8

export default function HotProducts({ categorySlug = '', query = '', onMore }) {
  const [tab, setTab] = useState('all')
  const [sort, setSort] = useState('default')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState([]) // 已加载的分页，用于「加载更多」累积
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const seq = useRef(0)

  /** 外部切换品类时重置筛选条件 */
  useEffect(() => {
    setTab(categorySlug || 'all')
    setPage(1)
  }, [categorySlug])

  /** 搜索词变化时重置到第一页 */
  useEffect(() => {
    setPage(1)
  }, [query])

  useEffect(() => {
    let alive = true
    const id = ++seq.current
    setLoading(true)
    setError(null)
    const slug = TABS.find((t) => t.id === tab)?.slug || ''

    api
      .listProducts({ category: slug, sort, page, pageSize: PAGE_SIZE, q: query })
      .then((data) => {
        if (!alive || id !== seq.current) return
        setMeta(data.pagination)
        // 第一页覆盖，后续页追加
        setPages((prev) => (page === 1 ? [data.list] : [...prev, data.list]))
      })
      .catch((err) => {
        if (alive && id === seq.current) setError(err)
      })
      .finally(() => alive && id === seq.current && setLoading(false))

    return () => {
      alive = false
    }
  }, [tab, sort, page, query])

  const list = useMemo(() => pages.flat(), [pages])
  const hasMore = meta ? meta.page < meta.totalPages : false

  const switchTab = (id) => {
    setTab(id)
    setPage(1)
    setPages([])
  }

  const switchSort = (id) => {
    setSort(id)
    setPage(1)
    setPages([])
  }

  return (
    <section className="section hot" id="hot">
      <div className="container">
        <div className="section-head">
          <div className="section-head__left">
            <span className="section-head__eyebrow">Best sellers</span>
            <h2 className="section-head__title">
              {query ? `“${query}”的搜索结果` : '本周热门单品'}
            </h2>
            <p className="section-head__desc">
              {query
                ? meta
                  ? `共找到 ${meta.total} 件相关商品`
                  : '正在搜索…'
                : '按近 7 天真实成交与收藏数据排序，每 24 小时更新。'}
            </p>
          </div>
        </div>

        <div className="hot__bar">
          <div className="hot__tabs" role="tablist" aria-label="商品分类筛选">
            {TABS.map((t) => (
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
                onClick={() => switchSort(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {error && <ErrorState error={error} onRetry={() => setPage(page)} />}

        {loading && pages.length === 0 && <SkeletonGrid count={PAGE_SIZE} />}

        {!loading && !error && list.length === 0 && (
          <EmptyState
            text={query ? `没有找到与“${query}”相关的商品` : '该分类暂时没有在售商品'}
            hint={query ? '试试更换关键词，或浏览下方全部商品' : '换个分类看看吧'}
          />
        )}

        {list.length > 0 && (
          <div className="hot__grid">
            {list.map((p) => (
              <div className="hot__item" key={p.id}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}

        <div className="hot__more">
          {hasMore ? (
            <button
              className="btn btn--ghost"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
            >
              {loading ? '加载中…' : '加载更多'}
              <IconArrowRight size={17} />
            </button>
          ) : (
            list.length > 0 && <span className="hot__end">已展示全部 {meta?.total} 件商品</span>
          )}
        </div>
      </div>
    </section>
  )
}
