import { useCallback, useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import HeroCarousel from './components/HeroCarousel'
import GuaranteeBar from './components/GuaranteeBar'
import CategorySection from './components/CategorySection'
import HotProducts from './components/HotProducts'
import PromoSection from './components/PromoSection'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import { IconCheck } from './components/Icons'

/** 滚动进入视口时给 .reveal 元素加上 is-visible */
function useRevealOnScroll() {
  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('is-visible'))
      return undefined
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])
}

export default function App() {
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const toastId = useRef(0)

  useRevealOnScroll()

  const pushToast = useCallback((text) => {
    const id = (toastId.current += 1)
    setToasts((prev) => [...prev, { id, text }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2400)
  }, [])

  /** 加入购物车：同商品同配色合并数量 */
  const addToCart = useCallback(
    (product, color) => {
      const key = `${product.id}-${color}`
      setCart((prev) => {
        const hit = prev.find((it) => it.key === key)
        if (hit) {
          return prev.map((it) => (it.key === key ? { ...it, qty: it.qty + 1 } : it))
        }
        return [
          ...prev,
          {
            key,
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.image,
            color,
            qty: 1,
          },
        ]
      })
      pushToast(`已加入购物车 · ${product.title}`)
    },
    [pushToast]
  )

  const changeQty = useCallback((key, qty) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((it) => it.key !== key)
        : prev.map((it) => (it.key === key ? { ...it, qty } : it))
    )
  }, [])

  const removeItem = useCallback((key) => {
    setCart((prev) => prev.filter((it) => it.key !== key))
  }, [])

  const cartCount = cart.reduce((n, it) => n + it.qty, 0)

  return (
    <>
      <Header cartCount={cartCount} onOpenCart={() => setCartOpen(true)} />

      <main>
        <HeroCarousel />

        <GuaranteeBar />

        <div className="reveal">
          <CategorySection />
        </div>

        <div className="reveal">
          <HotProducts onAddToCart={addToCart} />
        </div>

        <div className="reveal">
          <PromoSection onAddToCart={addToCart} />
        </div>
      </main>

      <Footer />

      <CartDrawer
        open={cartOpen}
        items={cart}
        onClose={() => setCartOpen(false)}
        onChangeQty={changeQty}
        onRemove={removeItem}
      />

      <div className="toast-layer" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <span className="toast__dot">
              <IconCheck size={12} />
            </span>
            {t.text}
          </div>
        ))}
      </div>
    </>
  )
}
