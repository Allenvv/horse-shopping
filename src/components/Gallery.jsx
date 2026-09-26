import { useState } from 'react'
import './Gallery.css'

/**
 * 商品图集
 *
 * 当前每个商品只有一张实拍主图，因此除主图外额外提供两个「细节视图」——
 * 用同一张原图按不同区域放大，对应真实电商里的面料特写与版型特写。
 * 后续接入多角度实拍时，只要往 `extra` 里塞图片地址即可，组件无需改动。
 */
const CROPS = [
  { id: 'main', label: '主图', scale: 1, x: 50, y: 42 },
  { id: 'fabric', label: '面料', scale: 2.1, x: 42, y: 30 },
  { id: 'fit', label: '版型', scale: 1.6, x: 52, y: 62 },
]

export default function Gallery({ image, title, badge }) {
  const [active, setActive] = useState(0)
  const view = CROPS[active]

  return (
    <div className="gallery">
      <div className="gallery__stage">
        <img
          src={image}
          alt={title}
          style={{
            transform: `scale(${view.scale})`,
            transformOrigin: `${view.x}% ${view.y}%`,
          }}
        />
        {badge && <span className="gallery__badge">{badge}</span>}
        <span className="gallery__view-tag">{view.label}</span>
      </div>

      <div className="gallery__thumbs" role="tablist" aria-label="商品图切换">
        {CROPS.map((c, i) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={i === active}
            className={`gallery__thumb ${i === active ? 'is-active' : ''}`}
            onClick={() => setActive(i)}
          >
            <img
              src={image}
              alt=""
              style={{ transform: `scale(${c.scale})`, transformOrigin: `${c.x}% ${c.y}%` }}
            />
            <span>{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
