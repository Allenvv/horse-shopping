/** 接口清单：与后端 /api/v1 一一对应，便于全局检索与后续抽离 */
import { http } from './client'

export const api = {
  /* 元数据 */
  getBanners: () => http.get('/meta/banners'),
  getCategories: () => http.get('/meta/categories'),
  getGuarantees: () => http.get('/meta/guarantees'),
  getCoupons: () => http.get('/meta/coupons'),
  getFlashSale: () => http.get('/meta/flash-sale'),
  getPayChannels: () => http.get('/meta/pay-channels'),

  /* 商品 */
  listProducts: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    )
    return http.get(`/products?${qs}`)
  },
  getProduct: (id) => http.get(`/products/${id}`),
  listReviews: (id, page = 1) => http.get(`/products/${id}/reviews?page=${page}`),

  /* 购物车 */
  getCart: () => http.get('/cart'),
  addToCart: (skuId, qty = 1) => http.post('/cart/items', { skuId, qty }),
  updateCartItem: (cartItemId, qty) => http.patch(`/cart/items/${cartItemId}`, { qty }),
  removeCartItem: (cartItemId) => http.delete(`/cart/items/${cartItemId}`),

  /* 优惠券 */
  claimCoupon: (code) => http.post(`/coupons/${code}/claim`),
  getMyCoupons: () => http.get('/coupons/mine'),

  /* 地址簿 */
  listAddresses: () => http.get('/addresses'),
  createAddress: (payload) => http.post('/addresses', payload),
  updateAddress: (id, payload) => http.patch(`/addresses/${id}`, payload),
  removeAddress: (id) => http.delete(`/addresses/${id}`),

  /* 订单与支付 */
  previewCheckout: () => http.get('/orders/preview'),
  createOrder: (payload) => http.post('/orders', payload),
  listOrders: () => http.get('/orders'),
  getOrder: (orderNo) => http.get(`/orders/${orderNo}`),
  cancelOrder: (orderNo) => http.post(`/orders/${orderNo}/cancel`),
  createPayment: (orderNo, channel) => http.post('/payments', { orderNo, channel }),
  getPaymentStatus: (paymentNo) => http.get(`/payments/${paymentNo}/status`),
  // 仅沙箱模式可用（未配置商户凭证时），用于本地跑通支付回调链路
  simulatePaySuccess: (paymentNo) => http.post(`/payments/dev/${paymentNo}/simulate-success`),
}
