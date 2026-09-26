import { useEffect, useState } from 'react'
import { api } from '../api/services'
import { timeAgo } from '../utils/money'
import { IconStar } from './Icons'
import { EmptyState } from './State'
import './ReviewList.css'

/** 星级 */
export function Stars({ value = 0, size = 13 }) {
  return (
    <span className="stars" aria-label={`${value} 星`}>
      {Array.from({ length: 5 }, (_, i) => (
        <IconStar key={i} size={size} className={i < Math.round(value) ? 'is-on' : ''} />
      ))}
    </span>
  )
}

/**
 * 评价区：评分分布 + 列表 + 分页
 * @param {number} productId
 * @param {object} summary { rating, reviewCount }
 */
export default function ReviewList({ productId, summary }) {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    api
      .listReviews(productId, page)
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [productId, page])

  if (!data) {
    return <div className="reviews reviews--loading">评价加载中…</div>
  }

  const dist = data.distribution || {}
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="reviews">
      {/* 概览 */}
      <div className="reviews__summary">
        <div className="reviews__score">
          <b>{summary?.rating ?? '—'}</b>
          <Stars value={summary?.rating || 0} size={15} />
          <span>共 {summary?.reviewCount || 0} 条评价</span>
        </div>

        <ul className="reviews__dist">
          {[5, 4, 3, 2, 1].map((star) => {
            const n = dist[star] || 0
            return (
              <li key={star}>
                <span className="reviews__dist-label">{star} 星</span>
                <span className="reviews__dist-bar">
                  <i style={{ width: `${(n / total) * 100}%` }} />
                </span>
                <span className="reviews__dist-num">{n}</span>
              </li>
            )
          })}
        </ul>
      </div>

      {/* 列表 */}
      {data.list.length === 0 ? (
        <EmptyState text="还没有评价" hint="成为第一个分享穿着感受的人" compact />
      ) : (
        <ul className="reviews__list">
          {data.list.map((r) => (
            <li className="review" key={r.id}>
              <div className="review__head">
                <span className="review__avatar">{r.user_name.slice(0, 1).toUpperCase()}</span>
                <span className="review__who">
                  <b>{r.user_name}</b>
                  <em>{timeAgo(r.created_at)}</em>
                </span>
                <Stars value={r.rating} />
              </div>
              <p className="review__body">{r.content}</p>
              <p className="review__meta">
                {r.color && <span>{r.color}</span>}
                {r.size && <span>{r.size}</span>}
                <span className="review__liked">👍 {r.liked}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* 分页 */}
      {data.pagination.totalPages > 1 && (
        <div className="reviews__pager">
          <button
            className="btn btn--ghost btn--sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </button>
          <span>
            {page} / {data.pagination.totalPages}
          </span>
          <button
            className="btn btn--ghost btn--sm"
            disabled={page >= data.pagination.totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
