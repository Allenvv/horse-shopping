import { IconPlus } from './Icons'
import './QuantityStepper.css'

/**
 * 数量步进器
 * @param {number} value 当前数量
 * @param {number} max   上限（通常为库存），达到后加号禁用
 * @param {(n:number)=>void} onChange
 */
export default function QuantityStepper({
  value,
  max = 99,
  min = 1,
  onChange,
  size = 'md',
  disabled = false,
}) {
  const canDec = !disabled && value > min
  const canInc = !disabled && value < max

  return (
    <div className={`qty qty--${size} ${disabled ? 'is-disabled' : ''}`}>
      <button
        type="button"
        onClick={() => canDec && onChange(value - 1)}
        disabled={!canDec}
        aria-label="减少数量"
      >
        −
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={() => canInc && onChange(value + 1)}
        disabled={!canInc}
        aria-label="增加数量"
      >
        <IconPlus size={size === 'sm' ? 11 : 13} />
      </button>
    </div>
  )
}
