/** 导航配置：统一使用路由路径，页面组件不再出现 # 锚点 */
export const NAV = [
  { label: '新品首发', to: '/list?sort=new', hot: true },
  { label: '上衣卫衣', to: '/list?category=tops' },
  { label: '外套大衣', to: '/list?category=outerwear' },
  { label: '裤装', to: '/list?category=trousers' },
  { label: '鞋履', to: '/list?category=footwear' },
  { label: '包袋配饰', to: '/list?category=bags' },
  { label: '折扣专区', to: '/list?sort=price_asc', hot: true },
]

/** 移动端底部导航 */
export const TAB_BAR = [
  { id: 'home', label: '首页', href: '/' },
  { id: 'categories', label: '分类', href: '/list' },
  { id: 'cart', label: '购物车', href: '/cart' },
  { id: 'coupon', label: '活动', href: '/coupons' },
  { id: 'me', label: '我的', href: '/mine' },
]
