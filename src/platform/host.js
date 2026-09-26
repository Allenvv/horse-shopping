import { useEffect, useState } from 'react'

/**
 * 宿主环境适配层：一套代码跑三类载体
 *
 *  1. site  官网（独立域名，完整头部/页脚/营销区块）
 *  2. h5    手机浏览器 / 微信内打开（移动优先，底部 TabBar）
 *  3. app   马甲包 / 壳应用 WebView 内嵌（隐藏自有导航，走原生桥）
 *
 * 判定优先级：
 *  URL 参数 > 构建模式（VITE_TARGET）> 宿主注入的全局对象 > UA 推断
 *
 * 注意：URL 参数必须排在最前。VITE_TARGET 会在构建期被内联成常量，
 * 若把它放首位，官网构建产物里 ?platform=app 这类运行时覆盖就会失效。
 */

const TARGETS = ['site', 'h5', 'app']

function detectPlatform() {
  // 1) 运行时覆盖优先：调试、以及壳应用直接加载官网 URL 的场景
  const params = new URLSearchParams(window.location.search)
  const q = params.get('platform') || params.get('target')
  if (TARGETS.includes(q)) return q

  // 2) 构建期固定目标（被内联为常量，因此只能作为兜底）
  const build = import.meta.env.VITE_TARGET
  if (TARGETS.includes(build)) return build

  // 3) 壳应用桥
  if (window.CHAOYE_BRIDGE) return 'app'

  // 4) 移动端 UA → h5，否则官网
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 'h5' : 'site'
}

export const platform = {
  target: typeof window !== 'undefined' ? detectPlatform() : 'site',

  get isApp() {
    return this.target === 'app'
  },
  get isMobile() {
    return this.target === 'h5' || this.target === 'app'
  },
  get showChrome() {
    // 内嵌宿主里不渲染自有 Header / Footer，由原生导航承担
    return this.target !== 'app'
  },
  get showTabBar() {
    // 底部导航是「视口驱动」的交互组件：窄屏就该有，与构建目标无关。
    // 桌面访问官网时不出现；手机访问官网、H5、内嵌包都会出现。
    return this.isNarrow || this.target === 'app'
  },

  get isNarrow() {
    return typeof window !== 'undefined' && window.innerWidth <= 720
  },

  /** 暴露给原生端的动作（壳应用通过 CHAOYE_BRIDGE 调用） */
  // eslint-disable-next-line class-methods-use-this
  notifyHost(event, payload) {
    try {
      window.CHAOYE_BRIDGE?.onWebEvent?.(event, payload)
      window.webkit?.messageHandlers?.chaoye?.postMessage?.({ event, payload })
      window.CHAOYE_ANDROID?.postEvent?.(event, JSON.stringify(payload || {}))
    } catch {
      /* 宿主桥不可用时静默忽略 */
    }
  },
}

/**
 * 响应式版本的平台信息：随视口宽度变化重新计算，
 * 让「官网在手机浏览器里打开」也能获得移动端外壳（底部导航等）。
 */
export function usePlatform() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 720
  )

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth <= 720)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return {
    target: platform.target,
    isApp: platform.target === 'app',
    isNarrow: narrow,
    showChrome: platform.target !== 'app',
    showTabBar: narrow || platform.target === 'app',
    notifyHost: platform.notifyHost,
  }
}
