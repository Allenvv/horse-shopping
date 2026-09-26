import { useStore } from '../store/AppStore'
import { IconCheck, IconClose } from './Icons'

/** 全局轻提示层：由 store 驱动，任何页面调用 pushToast 即可 */
export default function ToastLayer() {
  const { toasts } = useStore()
  return (
    <div className="toast-layer" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div className={`toast toast--${t.kind}`} key={t.id}>
          <span className="toast__dot">
            {t.kind === 'error' ? <IconClose size={12} /> : <IconCheck size={12} />}
          </span>
          {t.text}
        </div>
      ))}
    </div>
  )
}
