import { useRequest } from '../../../hooks/useRequest'
import { api } from '../../../api/services'
import { IconRefresh, IconScissors, IconShield, IconTruck } from '../../../components/Icons'
import './GuaranteeBar.css'

const ICONS = {
  g1: IconShield,
  g2: IconRefresh,
  g3: IconTruck,
  g4: IconScissors,
}

export default function GuaranteeBar() {
  // 服务保障文案由服务端下发，保证官网 / H5 / 内嵌端三端一致
  const { data: items } = useRequest(() => api.getGuarantees(), [])

  if (!items?.length) return null

  return (
    <section className="guarantee" aria-label="服务保障">
      <div className="container">
        <ul className="guarantee__list">
          {items.map((g) => {
            const Icon = ICONS[g.id] || IconShield
            return (
              <li key={g.id} className="guarantee__item">
                <span className="guarantee__icon">
                  <Icon size={21} />
                </span>
                <span className="guarantee__text">
                  <b>{g.title}</b>
                  <i>{g.desc}</i>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
