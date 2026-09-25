import { GUARANTEES } from '../data/catalog'
import { IconRefresh, IconScissors, IconShield, IconTruck } from './Icons'
import './GuaranteeBar.css'

const ICONS = {
  g1: IconShield,
  g2: IconRefresh,
  g3: IconTruck,
  g4: IconScissors,
}

export default function GuaranteeBar() {
  return (
    <section className="guarantee" aria-label="服务保障">
      <div className="container">
        <ul className="guarantee__list">
          {GUARANTEES.map((g) => {
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
