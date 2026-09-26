/**
 * 微信支付适配器 —— Native 扫码支付（API v3）
 * 官方文档：https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_1.shtml
 *
 * 真实模式签名规范：
 *   Authorization: WECHATPAY2-SHA256-RSA2048 mchid="...",nonce_str="...",
 *                  signature="...",timestamp="...",serial_no="..."
 *   签名串 = METHOD\nURL\n时间戳\n随机串\n请求体\n
 */
import crypto from 'node:crypto'
import { fenToYuan, isSandbox } from './gateway.js'

const API_BASE = 'https://api.mch.weixin.qq.com'

const env = () => ({
  appid: process.env.WECHAT_PAY_APPID,
  mchid: process.env.WECHAT_PAY_MCHID,
  serialNo: process.env.WECHAT_PAY_SERIAL_NO,
  privateKey: process.env.WECHAT_PAY_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  apiv3Key: process.env.WECHAT_PAY_APIV3_KEY,
})

/* ------------------------------------------------------------ 签名工具 */
function buildAuthorizationHeader(method, urlPath, body) {
  const { mchid, serialNo, privateKey } = env()
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = crypto.randomBytes(16).toString('hex')
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(message), privateKey).toString('base64')
  return (
    `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce}",` +
    `signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`
  )
}

/** 回调解密：AES-256-GCM，密钥为 APIv3 密钥 */
export function decryptNotifyResource(resource) {
  const { apiv3Key } = env()
  const { ciphertext, nonce, associated_data: aad } = resource
  const buf = Buffer.from(ciphertext, 'base64')
  const data = buf.subarray(0, buf.length - 16)
  const tag = buf.subarray(buf.length - 16)
  const decipher = crypto.createDecipheriv('aes-256-gcm', apiv3Key, nonce)
  decipher.setAAD(Buffer.from(aad || 'transaction', 'utf8'))
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

/* ------------------------------------------------------------ 下单 */
/**
 * @returns {Promise<{payUrl:string, sandbox:boolean, raw:object}>}
 *          payUrl 即「weixin://wxpay/bizpayurl?pr=xxx」，前端转二维码
 */
export async function createPayment({ order, notifyUrl, outTradeNo }) {
  const description = order.items[0]?.title?.slice(0, 60) || '潮野 CHAOYE 商品'
  const expireAt = new Date(Date.now() + 5 * 60 * 1000)

  if (isSandbox('wechat')) {
    // 沙箱：构造一个与真实格式一致的商户跳转链接
    return {
      sandbox: true,
      payUrl: `weixin://wxpay/bizpayurl?pr=${outTradeNo}&amount=${order.payable}`,
      expireAt,
    }
  }

  const { appid, mchid } = env()
  const urlPath = '/v3/pay/transactions/native'
  const body = JSON.stringify({
    appid,
    mchid,
    description,
    out_trade_no: outTradeNo,
    time_expire: expireAt.toISOString().replace(/\.\d{3}Z$/, '+08:00'),
    notify_url: notifyUrl,
    amount: { total: order.payable, currency: 'CNY' },
  })

  const resp = await fetch(`${API_BASE}${urlPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: buildAuthorizationHeader('POST', urlPath, body),
    },
    body,
  })
  const json = await resp.json()
  if (!resp.ok) {
    throw new Error(`微信下单失败(${resp.status}): ${json.message || JSON.stringify(json)}`)
  }
  return { sandbox: false, payUrl: json.code_url, expireAt, raw: json }
}

/* ------------------------------------------------------------ 回调 */
/**
 * 处理微信异步通知，返回标准化的支付结果。
 * 注意：真实模式还应校验平台证书签名，此处保留扩展点。
 */
export async function parseNotify(req) {
  const payload = req.body || {}

  if (isSandbox('wechat')) {
    // 沙箱回调由本地 dev 接口直接构造
    return {
      outTradeNo: payload.out_trade_no,
      channelTradeNo: payload.transaction_id,
      success: payload.trade_state === 'SUCCESS',
    }
  }

  const resource = JSON.parse(decryptNotifyResource(payload.resource))
  return {
    outTradeNo: resource.out_trade_no,
    channelTradeNo: resource.transaction_id,
    success: resource.trade_state === 'SUCCESS',
    raw: resource,
  }
}
