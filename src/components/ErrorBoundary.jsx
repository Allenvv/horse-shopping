import { Component } from 'react'

/**
 * 错误边界：任一区块渲染异常时只降级该区块，不让整站白屏。
 * 电商首页由多个独立区块组成，一个挂掉不应该影响可浏览的商品。
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', this.props.label || '', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="boundary-fallback" role="alert">
          <p className="boundary-fallback__title">
            {this.props.label || '该模块'}加载异常
          </p>
          <p className="boundary-fallback__msg">{this.state.error.message}</p>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => this.setState({ error: null })}
          >
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
