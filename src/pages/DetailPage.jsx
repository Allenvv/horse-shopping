import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/services'
import { useStore } from '../store/AppStore'
import { fmt, num } from '../utils/money'
import Gallery from '../components/Gallery'
import Price from '../components/Price'
import QuantityStepper from '../components/QuantityStepper'
import ReviewList, { Stars } from '../components/ReviewList'
import { ErrorState } from '../components/State'
import { IconArrowRight, IconCart, IconHeart, IconShield, IconTruck } from '../components/Icons'
import './pages.css'

export default function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { pushToast, refreshCart, setCheckout } = useStore()

  const [detail, setDetail] = useState(null)
  const [error, setError] = useState(null)
  const [colorName, setColorName] = useState(null)
  const [size, setSize] = useState(null)
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [liked, setLiked] = useState(false)

  const load = () => {
    setError(null)
    setDetail(null)
    api
      .getProduct(id)
      .then((d) => {
        setDetail(d)
        const color = d.colors.find((c) => c.totalStock > 0) || d.colors[0]
        setColorName(color?.name || null)
        setSize(color?.sizes.find((s) => s.stock > 0) || null)
        setQty(1)
      })
      .catch(setError)
  }

  useEffect(load, [id])

  const color = useMemo(
    () => detail?.colors.find((c) => c.name === colorName),
    [detail, colorName]
  )
  const unitPrice = detail ? detail.price + (size?.priceDiff || 0) : 0
  const canBuy = Boolean(color && size && size.stock >= qty)

  const addToCart = async () => {
    if (!canBuy) return
    setBusy(true)
    try {
      await api.addToCart(size.skuId, qty)
      await refreshCart()
      pushToast(`已加入购物车 · ${detail.title}`)
    } catch (err) {
      pushToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const buyNow = () => {
    if (!canBuy) return
    setCheckout({ buyNow: [{ skuId: size.skuId, qty }] })
  }

  if (error) {
    return (
      <div className="container page">
        <ErrorState error={error} onRetry={load} />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="container page detail-skeleton">
        <div className="skel skel--media" />
        <div>
          <div className="skel skel--line w70" />
          <div className="skel skel--line w45" />
          <div className="skel skel--line w30" />
        </div>
      </div>
    )
  }

  return (
    <div className="container page detail">
      <nav className="crumbs" aria-label="面包屑">
        <Link to="/">首页</Link>
        <span>/</span>
        <Link to={`/list?category=${detail.categorySlug}`}>{detail.categoryName}</Link>
        <span>/</span>
        <span>{detail.title}</span>
      </nav>

      <div className="detail__top">
        <Gallery image={detail.image} title={detail.title} badge={detail.badge} />

        <div className="detail__info">
          <h1 className="detail__title">{detail.title}</h1>
          <p className="detail__sub">{detail.subtitle}</p>

          <div className="detail__stats">
            <Stars value={detail.rating || 0} size={14} />
            <b>{detail.rating ?? '暂无'}</b>
            <span>{num(detail.reviewCount)} 条评价</span>
            <span className="detail__dot" />
            <span>已售 {num(detail.sales)}</span>
            <span className="detail__dot" />
            <span>货号 {detail.spuCode}</span>
          </div>

          <div className="detail__price-box">
            <Price fen={detail.price} size="xl" origin={detail.originPrice} />
            {detail.discountPercent > 0 && (
              <span className="detail__off">省 {detail.discountPercent}%</span>
            )}
          </div>

          {/* 颜色 */}
          <div className="opt">
            <span className="opt__label">颜色</span>
            <div className="opt__items">
              {detail.colors.map((c) => (
                <button
                  key={c.name}
                  className={`opt-color ${colorName === c.name ? 'is-active' : ''} ${
                    c.totalStock === 0 ? 'is-disabled' : ''
                  }`}
                  onClick={() => {
                    setColorName(c.name)
                    setSize(c.sizes.find((s) => s.stock > 0) || null)
                    setQty(1)
                  }}
                  disabled={c.totalStock === 0}
                >
                  <span className="opt-color__dot" style={{ background: c.hex }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* 尺码 */}
          {color && (
            <div className="opt">
              <span className="opt__label">尺码</span>
              <div className="opt__items">
                {color.sizes.map((s) => (
                  <button
                    key={s.skuId}
                    className={`opt-size ${size?.skuId === s.skuId ? 'is-active' : ''} ${
                      s.stock === 0 ? 'is-disabled' : ''
                    }`}
                    onClick={() => {
                      setSize(s)
                      setQty(1)
                    }}
                    disabled={s.stock === 0}
                  >
                    {s.size}
                  </button>
                ))}
              </div>
              <span className={`opt__stock ${size && size.stock <= 5 ? 'is-low' : ''}`}>
                {size
                  ? size.stock > 0
                    ? `库存 ${size.stock} 件${size.stock <= 5 ? ' · 仅剩少量' : ''}`
                    : '该尺码已售罄'
                  : '请选择尺码'}
              </span>
            </div>
          )}

          {/* 数量 */}
          <div className="opt opt--row">
            <span className="opt__label">数量</span>
            <QuantityStepper
              value={qty}
              max={size?.stock || 1}
              onChange={setQty}
              size="lg"
              disabled={!size}
            />
            <span className="opt__sum">
              小计 <b>¥{fmt(unitPrice * qty)}</b>
            </span>
          </div>

          {/* 操作 */}
          <div className="detail__actions">
            <button className="btn btn--ghost detail__buy" onClick={buyNow} disabled={!canBuy}>
              立即购买
            </button>
            <button className="btn btn--primary detail__add" onClick={addToCart} disabled={!canBuy || busy}>
              <IconCart size={17} />
              {busy ? '加入中…' : canBuy ? '加入购物车' : '请选择款式'}
            </button>
            <button
              className={`detail__like ${liked ? 'is-liked' : ''}`}
              onClick={() => setLiked((v) => !v)}
              aria-label="收藏"
              aria-pressed={liked}
            >
              <IconHeart size={20} />
            </button>
          </div>

          <ul className="detail__promise">
            <li>
              <IconShield size={16} />
              正品保障 · 假一赔十
            </li>
            <li>
              <IconTruck size={16} />
              满 599 顺丰包邮 · 48h 内发货
            </li>
          </ul>
        </div>
      </div>

      {/* 商品参数 */}
      <section className="detail__block">
        <h2>商品参数</h2>
        <dl className="spec">
          <div>
            <dt>面料成分</dt>
            <dd>{detail.fabric}</dd>
          </div>
          <div>
            <dt>产地</dt>
            <dd>{detail.originPlace}</dd>
          </div>
          <div>
            <dt>洗涤说明</dt>
            <dd>{detail.care}</dd>
          </div>
          <div>
            <dt>商品描述</dt>
            <dd>{detail.description}</dd>
          </div>
        </dl>
      </section>

      {/* 尺码表 */}
      <section className="detail__block">
        <h2>尺码对照表</h2>
        <div className="table-wrap">
          <table className="size-table">
            <thead>
              <tr>
                <th>尺码</th>
                <th>胸围 / 腰围</th>
                <th>衣长 / 裤长</th>
                <th>肩宽 / 臀围</th>
                <th>袖长</th>
              </tr>
            </thead>
            <tbody>
              {detail.sizeChart.map((r) => (
                <tr key={r.size}>
                  <td>
                    <b>{r.size}</b>
                  </td>
                  <td>{r.chest}</td>
                  <td>{r.length}</td>
                  <td>{r.shoulder}</td>
                  <td>{r.sleeve || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="size-table__tip">
          手工测量存在 1-3cm 误差。模特身高 178cm / 体重 68kg，日常穿 L 码。
        </p>
      </section>

      {/* 评价 */}
      <section className="detail__block">
        <h2>用户评价</h2>
        <ReviewList productId={detail.id} summary={detail} />
      </section>

      <div className="detail__foot">
        <button className="btn btn--ghost" onClick={() => navigate('/list')}>
          继续逛其他商品
          <IconArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
