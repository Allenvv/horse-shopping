import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fmt, num, offPercent } from '../utils/money'
import { useStore } from '../store/AppStore'
import { IconCart, IconCheck, IconHeart, IconStar } from './Icons'
import './ProductCard.css'

export default function ProductCard({ product }) {
  const { openSkuPicker } = useStore()
  const [colorIndex, setColorIndex] = useState(0)
  const [liked, setLiked] = useState(false)

  const off = offPercent(product.price, product.originPrice)
  const isDiscountBadge = product.badge?.startsWith('-')

  return (
    <article className="pcard">
      <Link className="pcard__media" to={`/product/${product.id}`} aria-label={product.title}>
        <img src={product.image} alt={product.title} loading="lazy" />

        <div className="pcard__badges">
          {product.badge && (
            <span className={`tag ${isDiscountBadge ? '' : 'tag--dark'}`}>{product.badge}</span>
          )}
          {!isDiscountBadge && off >= 25 && <span className="tag tag--soft">省 {off}%</span>}
        </div>

        <button
          className={`pcard__like ${liked ? 'is-liked' : ''}`}
          onClick={() => setLiked((v) => !v)}
          aria-label={liked ? '取消收藏' : '加入收藏'}
          aria-pressed={liked}
        >
          <IconHeart size={17} />
        </button>

        <div className="pcard__hover">
          <button className="pcard__add" onClick={() => openSkuPicker(product)}>
            <IconCart size={16} />
            选择款式
          </button>
        </div>
      </Link>

      <div className="pcard__body">
        <h3 className="pcard__title">
          <Link to={`/product/${product.id}`}>{product.title}</Link>
        </h3>
        <p className="pcard__sub">{product.subtitle}</p>

        <div className="pcard__rating">
          <span className="pcard__stars" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <IconStar key={i} className={i < Math.round(product.rating || 0) ? 'is-on' : ''} />
            ))}
          </span>
          <span className="pcard__score">{product.rating ?? '暂无'}</span>
          <span className="pcard__sold">已售 {num(product.sales)}</span>
        </div>

        <div className="pcard__colors">
          {product.colors?.map((c, i) => (
            <button
              key={c.name}
              className={`swatch ${i === colorIndex ? 'is-active' : ''}`}
              style={{ '--swatch': c.hex }}
              onClick={() => setColorIndex(i)}
              aria-label={c.name}
              title={c.name}
              aria-pressed={i === colorIndex}
            />
          ))}
          {product.colors?.length > 1 && (
            <span className="pcard__color-name">{product.colors.length} 色可选</span>
          )}
        </div>

        <div className="pcard__foot">
          <span className="pcard__price">
            <i>¥</i>
            {fmt(product.price)}
          </span>
          {product.originPrice > product.price && (
            <s className="pcard__origin">¥{fmt(product.originPrice)}</s>
          )}
        </div>
      </div>
    </article>
  )
}

/** 已加入购物车的对勾小图标（预留复用） */
export const AddedMark = () => <IconCheck size={16} />
