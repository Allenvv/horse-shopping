/** 全局业务配置：改这里即可调整运营规则，无需动业务代码 */
export const config = {
  /** 包邮门槛（分） */
  freightFreeThreshold: 59900,
  /** 统一运费（分） */
  freightFlat: 1500,
  /** 未支付订单自动关闭时长（分钟） */
  orderAutoCloseMinutes: 30,
  /** 支付单有效期（分钟） */
  paymentExpireMinutes: 5,
  /** 秒杀活动 id（当前只有一场） */
  activeFlashSaleId: 1,
  /** 服务保障条（放在服务端，保证官网 / H5 / 内嵌端文案一致） */
  guarantees: [
    { id: 'g1', title: '正品保障', desc: '品牌直营 · 假一赔十' },
    { id: 'g2', title: '7 天无理由', desc: '不满意随时退换' },
    { id: 'g3', title: '顺丰包邮', desc: '满 599 元全国包邮' },
    { id: 'g4', title: '免费改衣', desc: '裤长袖长到店免费改' },
  ],
}

/** 订单状态机：哪些状态允许流转到哪些状态 */
export const ORDER_TRANSITIONS = {
  pending_payment: ['paid', 'cancelled', 'closed'],
  paid: ['shipped', 'refunded'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
  closed: [],
  refunded: [],
}

export const canTransition = (from, to) => (ORDER_TRANSITIONS[from] || []).includes(to)
