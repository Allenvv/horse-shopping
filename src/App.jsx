import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import Header from './components/Header'
import Footer from './components/Footer'
import MobileTabBar from './components/MobileTabBar'
import ErrorBoundary from './components/ErrorBoundary'
import ToastLayer from './components/Toast'
import SkuPicker from './components/SkuPicker'
import CheckoutSheet from './components/CheckoutSheet'
import PaymentSheet from './components/PaymentSheet'

import HomePage from './pages/HomePage'
import ListPage from './pages/ListPage'
import DetailPage from './pages/DetailPage'
import CartPage from './pages/CartPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import CouponsPage from './pages/CouponsPage'
import MinePage from './pages/MinePage'
import NotFoundPage from './pages/NotFoundPage'

import { AppStoreProvider, useStore } from './store/AppStore'
import { initTokenFromHost } from './api/client'
import { usePlatform } from './platform/host'

/** 路由切换回到顶部（否则从长列表进详情会停在半空） */
function ScrollToTop() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, search])
  return null
}

function Shell() {
  const { refreshCart } = useStore()
  const platform = usePlatform()

  useEffect(() => {
    initTokenFromHost()
    refreshCart()
    platform.notifyHost('ready', { platform: platform.target })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshCart])

  return (
    <>
      {platform.showChrome && <Header />}

      <main className={platform.showTabBar ? 'main--with-tabbar' : ''}>
        <ErrorBoundary label="页面">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/list" element={<ListPage />} />
            <Route path="/product/:id" element={<DetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/order/:orderNo" element={<OrderDetailPage />} />
            <Route path="/coupons" element={<CouponsPage />} />
            <Route path="/mine" element={<MinePage />} />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {platform.showChrome && <Footer />}
      {platform.showTabBar && <MobileTabBar />}

      {/* 全局弹层：任何页面都能唤起 */}
      <SkuPicker />
      <CheckoutSheet />
      <PaymentSheet />
      <ToastLayer />
    </>
  )
}

export default function App() {
  return (
    // 用 HashRouter 而非 BrowserRouter：
    // 内嵌 App 常以 file:// 或任意子路径加载，Hash 路由不需要服务端重写规则，
    // 一套产物可以同时跑在官网、H5 与壳应用里。
    <HashRouter>
      <AppStoreProvider>
        <ScrollToTop />
        <Shell />
      </AppStoreProvider>
    </HashRouter>
  )
}
