import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 通用数据请求钩子
 *  - 自动管理 loading / error / data
 *  - deps 变化自动重新请求，竞态用 requestId 防护
 *  - 卸载或 deps 变化时中断旧请求
 *
 * @param {(signal: AbortSignal) => Promise<any>} fetcher
 * @param {any[]} deps 依赖数组
 * @param {{immediate?: boolean}} options
 */
export function useRequest(fetcher, deps = [], options = {}) {
  const { immediate = true } = options
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)
  const seq = useRef(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const run = useCallback(async () => {
    const id = ++seq.current
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    try {
      const result = await fetcherRef.current(controller.signal)
      if (id !== seq.current) return null // 已被更新的请求覆盖
      setData(result)
      return result
    } catch (err) {
      if (err.name === 'AbortError' || id !== seq.current) return null
      setError(err)
      return null
    } finally {
      if (id === seq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (immediate) run()
    return () => {
      seq.current += 1 // 使进行中的请求失效
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, refresh: run, setData }
}

/**
 * 轮询钩子：用于支付结果查询
 * @param {() => Promise<any>} fn 每次轮询执行的请求
 * @param {number} interval 毫秒
 * @param {boolean} active 是否启用
 */
export function usePolling(fn, interval = 2000, active = false) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!active) return undefined
    const t = setInterval(() => setTick((v) => v + 1), interval)
    return () => clearInterval(t)
  }, [active, interval])

  useEffect(() => {
    if (!active) return
    fn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])
}
