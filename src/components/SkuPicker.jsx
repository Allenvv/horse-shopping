import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/services'
import { useStore } from '../store/AppStore'
import { fmt, fmt2 } from '../utils/money'
import { IconCart, IconClose, IconPlus, IconCheck } from './Icons'
import './SkuPicker.css'

/**
 * SKU 选择弹层：选颜色 → 选尺码 → 数量 → 加入购物车 / 立即购买
 * 数据来自商品详情接口的 colors[].sizes[]，包含真实库存。
 */
export default function SkuPicker() {
  const { skuPicker, closeSkuPicker, pushToast, setCheckout, refreshCart } = useStore()
  const product = skuPicker?.product

  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [colorName, setColorName] = useState(null)
  const [size, setSize] = useState(null) // {skuId, size, stock}
  const [qty, setQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  /* 打开时拉取详情 */
  useEffect(() => {
    if (!product) return undefined
    let alive = true
    setLoading(true)
    setError(null)
    setDetail(null)
    setColorName(null)
    setSize(null)
    setQty(1)
    api
      .getProduct(product.id)
      .then((d) => {
        if (!alive) return
        setDetail(d)
        // 默认选中第一个有货的颜色，并在该颜色下选第一个有货尺码
        const color = d.colors.find((c) => c.totalStock > 0) || d.colors[0]
        if (color) {
          setColorName(color.name)
          const s = color.sizes.find((x) => x.stock > 0)
          if (s) setSize(s)
        }
      })
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [product])

  /* Esc 关闭 + 锁滚动 */
  useEffect(() => {
    if (!product) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && closeSkuPicker()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [product, closeSkuPicker])

  const color = useMemo(
    () => detail?.colors.find((c) => c.name === colorName),
    [detail, colorName]
  )
  const unitPrice = useMemo(() => {
    if (!detail) return 0
    return detail.price + (size?.priceDiff || 0)
  }, [detail, size])

  if (!product) return null

  const canSubmit = detail && color && size && size.stock >= qty

  const handleAdd = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      await api.addToCart(size.skuId, qty)
      // 加购成功后同步服务端购物车，头部角标与抽屉数量立刻一致
      await refreshCart()
      pushToast(`已加入购物车 · ${detail.title}`)
      closeSkuPicker()
    } catch (err) {
      pushToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBuyNow = () => {
    if (!canSubmit) return
    setCheckout({ buyNow: [{ skuId: size.skuId, qty }], closeSkuPicker })
  }

  return (
    <>
      <div className="sheet-scrim is-open" onClick={closeSkuPicker} aria-hidden="true" />

      <aside className="sheet sku-sheet" role="dialog" aria-label="选择商品款式">
        <button className="sheet__close" onClick={closeSkuPicker} aria-label="关闭">
          <IconClose size={20} />
        </button>

        {/* 商品摘要 */}
        <div className="sku-sheet__head">
          <img className="sku-sheet__img" src={product.image} alt="" />
          <div className="sku-sheet__meta">
            <p className="sku-sheet__price">
              <i>¥</i>
              {loading ? '—' : fmt(unitPrice)}
            </p>
            <p className="sku-sheet__picked">
              {color ? `已选：${color.name}` : '请选择颜色'}
              {size && ` / ${size.size}`}
            </p>
            {size && (
              <p className={`sku-sheet__stock ${size.stock <= 5 ? 'is-low' : ''}`}>
                {size.stock > 0 ? `库存 ${size.stock} 件` : '该尺码已售罄'}
                {size.stock > 0 && size.stock <= 5 && ' · 仅剩少量'}
              </p>
            )}
          </div>
        </div>

        {loading && <div className="sku-sheet__loading">加载款式信息…</div>}
        {error && (
          <div className="sku-sheet__error">
            {error.message}
            <button onClick={() => window.location.reload()}>刷新页面</button>
          </div>
        )}

        {detail && (
          <div className="sku-sheet__body">
            {/* 颜色 */}
            <div className="sku-group">
              <h4>颜色</h4>
              <div className="sku-options">
                {detail.colors.map((c) => (
                  <button
                    key={c.name}
                    className={`sku-chip ${colorName === c.name ? 'is-active' : ''} ${
                      c.totalStock === 0 ? 'is-disabled' : ''
                    }`}
                    onClick={() => {
                      setColorName(c.name)
                      setSize(c.sizes.find((s) => s.stock > 0) || null)
                      setQty(1)
                    }}
                    disabled={c.totalStock === 0}
                  >
                    <span className="sku-chip__dot" style={{ background: c.hex }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 尺码 */}
            {color && (
              <div className="sku-group">
                <h4>尺码</h4>
                <div className="sku-options">
                  {color.sizes.map((s) => (
                    <button
                      key={s.skuId}
                      className={`sku-chip ${size?.skuId === s.skuId ? 'is-active' : ''} ${
                        s.stock === 0 ? 'is-disabled' : ''
                      }`}
                      onClick={() => {
                        setSize(s)
                        setQty(1)
                      }}
                      disabled={s.stock === 0}
                    >
                      {s.size}
                      {s.stock === 0 && <em>缺货</em>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 数量 */}
            <div className="sku-group sku-group--row">
              <h4>数量</h4>
              <div className="qty qty--lg">
                <button
                  onClick={() => setQty((v) => Math.max(1, v - 1))}
                  disabled={qty <= 1}
                  aria-label="减少数量"
                >
                  −
                </button>
                <span>{qty}</span>
                <button
                  onClick={() => setQty((v) => Math.min(size?.stock || 1, v + 1))}
                  disabled={!size || qty >= size.stock}
                  aria-label="增加数量"
                >
                  <IconPlus size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="sku-sheet__foot">
          <button
            className="btn btn--ghost sku-sheet__btn"
            onClick={handleBuyNow}
            disabled={!canSubmit || submitting}
          >
            立即购买
          </button>
          <button
            className={`btn btn--primary sku-sheet__btn ${submitting ? 'is-loading' : ''}`}
            onClick={handleAdd}
            disabled={!canSubmit || submitting}
          >
            {submitting ? <IconCheck size={17} /> : <IconCart size={17} />}
            {submitting ? '已加入' : canSubmit ? `加入购物车 · ¥${fmt2(unitPrice * qty)}` : '请选择款式'}
          </button>
        </div>
      </aside>
    </>
  )
}
