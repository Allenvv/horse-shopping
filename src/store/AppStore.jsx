import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { api } from '../api/services'
import { getCartToken } from '../api/client'

/**
 * 全局状态：购物车 / 提示 / 弹层编排
 * 故意不引 Redux/Zustand——状态就这几块，Context 足够，少一层依赖。
 */
const AppStore = createContext(null)

export function AppStoreProvider({ children }) {
  /* ---------------- 购物车 ---------------- */
  const [cart, setCart] = useState({ items: [], count: 0, goodsAmount: 0, hasIssue: false })
  const [cartOpen, setCartOpen] = useState(false)

  const refreshCart = useCallback(async () => {
    try {
      const data = await api.getCart()
      setCart(data)
      return data
    } catch {
      // 静默失败：购物车拉不下来不应阻塞页面浏览
      return null
    }
  }, [])

  /* ---------------- 提示 ---------------- */
  const [toasts, setToasts] = useState([])
  const toastSeq = useRef(0)

  const pushToast = useCallback((text, kind = 'success') => {
    const id = ++toastSeq.current
    setToasts((prev) => [...prev.slice(-2), { id, text, kind }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600)
  }, [])

  /* ---------------- 弹层：SKU 选择 / 结算 / 支付 ---------------- */
  const [skuPicker, setSkuPicker] = useState(null) // { product } | null
  const [checkout, setCheckout] = useState(null) // { skuIds? } | null
  const [payment, setPayment] = useState(null) // { orderNo, payable } | null

  const openSkuPicker = useCallback((product) => setSkuPicker({ product }), [])
  const closeSkuPicker = useCallback(() => setSkuPicker(null), [])
  const openCart = useCallback(() => {
    refreshCart()
    setCartOpen(true)
  }, [refreshCart])
  const closeCart = useCallback(() => setCartOpen(false), [])

  /** 从商品卡直接结算：先选 SKU，再进结算 */
  const startCheckout = useCallback(() => {
    setCartOpen(false)
    setCheckout({})
  }, [])

  const value = useMemo(
    () => ({
      cart,
      cartOpen,
      refreshCart,
      setCart,
      openCart,
      closeCart,
      toasts,
      pushToast,
      skuPicker,
      openSkuPicker,
      closeSkuPicker,
      checkout,
      setCheckout,
      payment,
      setPayment,
      token: getCartToken(),
    }),
    [
      cart, cartOpen, refreshCart, openCart, closeCart, toasts, pushToast,
      skuPicker, openSkuPicker, closeSkuPicker, checkout, payment,
    ]
  )

  return <AppStore.Provider value={value}>{children}</AppStore.Provider>
}

export const useStore = () => {
  const ctx = useContext(AppStore)
  if (!ctx) throw new Error('useStore 必须在 <AppStoreProvider> 内使用')
  return ctx
}
