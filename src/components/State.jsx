import './State.css'

/** 骨架屏：数据未返回时占位，避免布局跳动 */
export function SkeletonCard() {
  return (
    <div className="skel-card" aria-hidden="true">
      <div className="skel skel--media" />
      <div className="skel skel--line w70" />
      <div className="skel skel--line w45" />
      <div className="skel skel--line w30" />
    </div>
  )
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="hot__grid">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

/** 错误态：可重试 */
export function ErrorState({ error, onRetry, compact = false }) {
  return (
    <div className={`state ${compact ? 'state--compact' : ''}`} role="alert">
      <span className="state__icon">!</span>
      <p className="state__title">{error?.message || '加载失败'}</p>
      {onRetry && (
        <button className="btn btn--ghost btn--sm" onClick={onRetry}>
          重试
        </button>
      )}
    </div>
  )
}

/** 空态 */
export function EmptyState({ text, hint, action, compact = false }) {
  return (
    <div className={`state ${compact ? 'state--compact' : ''}`}>
      <span className="state__icon state__icon--muted">–</span>
      <p className="state__title">{text}</p>
      {hint && <p className="state__hint">{hint}</p>}
      {action}
    </div>
  )
}
