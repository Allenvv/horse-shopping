import { useState } from 'react'
import { formatPrice } from '../data/catalog'
import { IconCart, IconCheck, IconHeart, IconStar } from './Icons'
import './ProductCard.css'

export default function ProductCard({ product, onAddToCart }) {
  const [colorIndex, setColorIndex] = useState(0)
  const [liked, setLiked] = useState(false)
  const [adding, setAdding] = useState(false)

  const off = Math.round((1 - product.price / product.origin) * 100)
  /** 角标本身就是折扣信息时，不再重复展示「省 X%」 */
  const isDiscountBadge = product.badge?.startsWith('-')

  const handleAdd = () => {
    setAdding(true)
    onAddToCart(product, product.colors[colorIndex])
    window.setTimeout(() => setAdding(false), 1100)
  }

  return (
    <article className="pcard">
      <div className="pcard__media">
        <img src={product.image} alt={product.title} loading="lazy" />

        <div className="pcard__badges">
          {product.badge && (
            <span className={`tag ${isDiscountBadge ? '' : 'tag--dark'}`}>{product.badge}</span>
          )}
          {!isDiscountBadge && off >= 25 && (
            <span className="tag tag--soft">省 {off}%</span>
          )}
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
          <button className={`pcard__add ${adding ? 'is-adding' : ''}`} onClick={handleAdd}>
            {adding ? <IconCheck size={16} /> : <IconCart size={16} />}
            {adding ? '已加入购物车' : '加入购物车'}
          </button>
        </div>
      </div>

      <div className="pcard__body">
        <h3 className="pcard__title">{product.title}</h3>
        <p className="pcard__sub">{product.sub}</p>

        <div className="pcard__rating">
          <span className="pcard__stars" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <IconStar key={i} className={i < Math.round(product.rating) ? 'is-on' : ''} />
            ))}
          </span>
          <span className="pcard__score">{product.rating}</span>
          <span className="pcard__sold">已售 {formatPrice(product.sold)}</span>
        </div>

        <div className="pcard__colors">
          {product.colors.map((c, i) => (
            <button
              key={c + i}
              className={`swatch ${i === colorIndex ? 'is-active' : ''}`}
              style={{ '--swatch': c }}
              onClick={() => setColorIndex(i)}
              aria-label={`颜色 ${i + 1}`}
              aria-pressed={i === colorIndex}
            />
          ))}
          <span className="pcard__color-name">{product.colors.length} 色可选</span>
        </div>

        <div className="pcard__foot">
          <span className="pcard__price">
            <i>¥</i>
            {formatPrice(product.price)}
          </span>
          <s className="pcard__origin">¥{formatPrice(product.origin)}</s>
        </div>
      </div>
    </article>
  )
}
