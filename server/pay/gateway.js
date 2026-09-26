/**
 * 支付网关抽象层
 *
 * 设计目标：
 *  - 上层业务只认 `createPayment` / `handleNotify` 两个动作，不关心渠道差异；
 *  - 每个渠道提供「真实模式」与「沙箱模式」：
 *      · 真实模式：环境变量里配好商户凭证即启用，走官方接口 + 官方签名规范；
 *      · 沙箱模式：未配置凭证时自动降级，本地生成二维码，用与真实回调
 *        完全相同的落账函数跑通「下单 → 支付 → 回调 → 改单」整条链路。
 *
 * 环境变量：
 *  微信支付（Native 扫码，API v3）
 *    WECHAT_PAY_APPID / WECHAT_PAY_MCHID / WECHAT_PAY_SERIAL_NO
 *    WECHAT_PAY_PRIVATE_KEY（PEM，\\n 转义） / WECHAT_PAY_APIV3_KEY
 *  支付宝（当面付扫码）
 *    ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY（PKCS#8 PEM）/ ALIPAY_PUBLIC_KEY
 */
import { config } from '../config.js'

export const CHANNELS = ['wechat', 'alipay']

/** 当前渠道是否处于沙箱模式 */
export function isSandbox(channel) {
  if (channel === 'wechat') {
    return !(
      process.env.WECHAT_PAY_APPID &&
      process.env.WECHAT_PAY_MCHID &&
      process.env.WECHAT_PAY_SERIAL_NO &&
      process.env.WECHAT_PAY_PRIVATE_KEY &&
      process.env.WECHAT_PAY_APIV3_KEY
    )
  }
  if (channel === 'alipay') {
    return !(process.env.ALIPAY_APP_ID && process.env.ALIPAY_PRIVATE_KEY)
  }
  return true
}

/** 对外暴露的支付方式描述（给前端渲染支付选项） */
export function listChannels() {
  return [
    {
      channel: 'wechat',
      name: '微信支付',
      desc: '推荐使用微信扫一扫',
      sandbox: isSandbox('wechat'),
    },
    {
      channel: 'alipay',
      name: '支付宝',
      desc: '支付宝扫一扫即可付款',
      sandbox: isSandbox('alipay'),
    },
  ]
}

/** 运费/金额均以分为单位；渠道接口需要的是元，这里集中换算 */
export const fenToYuan = (fen) => (fen / 100).toFixed(2)
