import { useNavigate } from 'react-router-dom'
import ErrorBoundary from '../components/ErrorBoundary'
import HeroCarousel from './home/sections/HeroCarousel'
import GuaranteeBar from './home/sections/GuaranteeBar'
import CategorySection from './home/sections/CategorySection'
import HotProducts from './home/sections/HotProducts'
import PromoSection from './home/sections/PromoSection'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <>
      <ErrorBoundary label="轮播图">
        <HeroCarousel />
      </ErrorBoundary>

      <ErrorBoundary label="服务保障">
        <GuaranteeBar />
      </ErrorBoundary>

      <ErrorBoundary label="商品分类">
        <CategorySection onPick={(slug) => navigate(`/list?category=${slug === 'all' ? '' : slug}`)} />
      </ErrorBoundary>

      <ErrorBoundary label="热门商品">
        <HotProducts onMore={() => navigate('/list')} />
      </ErrorBoundary>

      <ErrorBoundary label="促销活动">
        <PromoSection />
      </ErrorBoundary>
    </>
  )
}
