/**
 * 支付宝适配器 —— 当面付扫码支付（alipay.trade.precreate）
 * 官方文档：https://opendocs.alipay.com/open/02ekfg
 *
 * 真实模式签名规范（RSA2）：
 *   1. 所有请求参数按 key 升序排列，拼成 k=v&k=v（不含 sign）；
 *   2. 用商户私钥做 SHA256withRSA 签名，base64 后放入 sign 字段。
 */
import crypto from 'node:crypto'
import { fenToYuan, isSandbox } from './gateway.js'

const GATEWAY = 'https://openapi.alipay.com/gateway.do'

const env = () => ({
  appId: process.env.ALIPAY_APP_ID,
  privateKey: process.env.ALIPAY_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY?.replace(/\\n/g, '\n'),
})

/** RSA2 签名：参数按 key 升序拼串后签名 */
function rsa2Sign(params) {
  const { privateKey } = env()
  const content = Object.keys(params)
    .filter((k) => k !== 'sign' && params[k] !== undefined && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return crypto.sign('RSA-SHA256', Buffer.from(content, 'utf8'), privateKey).toString('base64')
}

/* ------------------------------------------------------------ 下单 */
/**
 * @returns {Promise<{payUrl:string, sandbox:boolean, raw:object}>}
 *          payUrl 即商户订单二维码内容（用户用支付宝扫）
 */
export async function createPayment({ order, notifyUrl, outTradeNo }) {
  const subject = order.items[0]?.title?.slice(0, 60) || '潮野 CHAOYE 商品'
  const expireAt = new Date(Date.now() + 5 * 60 * 1000)

  if (isSandbox('alipay')) {
    return {
      sandbox: true,
      payUrl: `https://qr.alipay.com/bax${outTradeNo}`,
      expireAt,
    }
  }

  const { appId } = env()
  const params = {
    app_id: appId,
    method: 'alipay.trade.precreate',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    version: '1.0',
    notify_url: notifyUrl,
    biz_content: JSON.stringify({
      out_trade_no: outTradeNo,
      total_amount: fenToYuan(order.payable),
      subject,
      timeout_express: '5m',
    }),
  }
  params.sign = rsa2Sign(params)

  const resp = await fetch(GATEWAY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  const text = await resp.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`支付宝返回非 JSON：${text.slice(0, 200)}`)
  }
  const result = json.alipay_trade_precreate_response
  if (!result || result.code !== '10000') {
    throw new Error(`支付宝下单失败: ${result?.sub_msg || JSON.stringify(result)}`)
  }
  return { sandbox: false, payUrl: result.qr_code, expireAt, raw: result }
}

/* ------------------------------------------------------------ 回调 */
/** 验签并提取标准化结果；验签失败返回 success=false 并标记 unverified */
export async function parseNotify(req) {
  const params = req.body || {}
  const { alipayPublicKey } = env()

  const result = {
    outTradeNo: params.out_trade_no,
    channelTradeNo: params.trade_no,
    success: params.trade_status === 'TRADE_SUCCESS' || params.trade_status === 'TRADE_FINISHED',
  }

  if (isSandbox('alipay') || !alipayPublicKey) return result

  const sign = params.sign
  const content = Object.keys(params)
    .filter((k) => k !== 'sign' && k !== 'sign_type' && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  const verified = crypto.verify(
    'RSA-SHA256',
    Buffer.from(content, 'utf8'),
    alipayPublicKey,
    Buffer.from(sign, 'base64')
  )
  result.unverified = !verified
  if (!verified) result.success = false
  return result
}
