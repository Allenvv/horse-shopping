/**
 * HTTP 客户端
 *  - 统一处理后端响应包络 { code, message, data, requestId }
 *  - 业务错误抛 ApiClientError，组件层用 try/catch 或 hook 的 error 消费
 *  - 自动附带匿名令牌 x-cart-token（购物车 / 订单归属依据）
 *  - 15s 超时，网络错误自动重试 1 次（仅幂等 GET）
 */

const BASE = import.meta.env.VITE_API_BASE || ''
const TOKEN_KEY = 'chaoye.cartToken'

export class ApiClientError extends Error {
  /** @param {number} code 业务错误码，0 不会出现在这里 */
  constructor(message, code, status, detail) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.status = status
    this.detail = detail
  }
}

/** 匿名令牌：首次访问生成并持久化，后续所有请求携带 */
export function getCartToken() {
  let token = localStorage.getItem(TOKEN_KEY)
  if (!token || token.length < 8) {
    token = `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(TOKEN_KEY, token)
  }
  return token
}

export function setCartToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

/** 内嵌 App 宿主可能通过 bridge 注入令牌（保持会话与原生端一致） */
export function initTokenFromHost() {
  const injected = window.CHAOYE_BRIDGE?.cartToken
  if (injected && injected !== getCartToken()) setCartToken(injected)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function request(method, path, { body, signal, timeout = 15000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  if (signal) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  let resp
  try {
    resp = await fetch(`${BASE}/api/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-cart-token': getCartToken(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') throw err
    throw new ApiClientError('网络连接失败，请检查网络后重试', -1, 0)
  }
  clearTimeout(timer)

  let json
  try {
    json = await resp.json()
  } catch {
    throw new ApiClientError(`服务响应异常（HTTP ${resp.status}）`, -2, resp.status)
  }

  if (!resp.ok || json.code !== 0) {
    throw new ApiClientError(
      json.message || `请求失败（HTTP ${resp.status}）`,
      json.code ?? -3,
      resp.status,
      json.detail
    )
  }
  return json.data
}

const withRetry = async (fn, retries = 1) => {
  let lastErr
  for (let i = 0; i <= retries; i += 1) {
    try {
      return await fn()
    } catch (err) {
      // AbortError / 业务错误不重试，仅网络层失败重试
      if (err.name === 'AbortError' || err instanceof ApiClientError) throw err
      lastErr = err
      if (i < retries) await sleep(400 * (i + 1))
    }
  }
  throw lastErr
}

export const http = {
  get: (path, opts) => withRetry(() => request('GET', path, opts)),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  delete: (path, opts) => request('DELETE', path, opts),
}
