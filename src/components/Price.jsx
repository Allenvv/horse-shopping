import { fmt, fmt2 } from '../utils/money'

/**
 * 价格展示：后端一律以「分」传输，这里统一渲染成 ¥ 金额。
 * 集中一处的好处是——改货币符号、改小数位、改配色只需动这个文件。
 */
export default function Price({ fen, size = 'md', origin, className = '', exact = false }) {
  return (
    <span className={`price price--${size} ${className}`}>
      <span className="price__now">
        <i className="price__symbol">¥</i>
        {exact ? fmt2(fen) : fmt(fen)}
      </span>
      {origin > fen && <s className="price__origin">¥{fmt(origin)}</s>}
    </span>
  )
}
