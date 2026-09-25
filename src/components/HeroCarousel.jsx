import { useCallback, useEffect, useRef, useState } from 'react'
import { SLIDES } from '../data/catalog'
import { IconArrowRight, IconChevronLeft, IconChevronRight } from './Icons'
import './HeroCarousel.css'

const AUTOPLAY_MS = 5200

export default function HeroCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  /** 已播放时长（毫秒），暂停时保留，恢复时接着走 */
  const elapsedRef = useRef(0)
  /** 当前高亮进度条的 DOM 节点，直接改 transform 以避免每帧 re-render */
  const fillRef = useRef(null)

  const go = useCallback((next) => {
    elapsedRef.current = 0
    setIndex((prev) => (next + SLIDES.length) % SLIDES.length)
  }, [])

  /* 自动播放：requestAnimationFrame 驱动进度条 */
  useEffect(() => {
    if (paused) return undefined

    const startedAt = Date.now() - elapsedRef.current
    let raf = 0

    const tick = () => {
      const elapsed = Date.now() - startedAt
      elapsedRef.current = elapsed
      const pct = Math.min(elapsed / AUTOPLAY_MS, 1)
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${pct})`
      if (pct >= 1) {
        elapsedRef.current = 0
        setIndex((prev) => (prev + 1) % SLIDES.length)
        return
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [index, paused])

  /* 键盘左右方向键切换 */
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowLeft') go(index - 1)
      if (e.key === 'ArrowRight') go(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index])

  return (
    <section
      className="hero"
      id="top"
      aria-roledescription="轮播图"
      aria-label="潮野 CHAOYE 主推活动"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="hero__stage">
        {SLIDES.map((slide, i) => (
          <article
            key={slide.id}
            className={`slide ${i === index ? 'is-active' : ''}`}
            aria-hidden={i !== index}
          >
            <img className="slide__img" src={slide.image} alt="" draggable="false" />
            <div className="container slide__content">
              <div className="slide__text">
                <span className="slide__eyebrow">{slide.eyebrow}</span>
                <h1 className="slide__title">
                  {slide.title}
                  <em>{slide.titleAccent}</em>
                </h1>
                <p className="slide__desc">{slide.desc}</p>
                <div className="slide__actions">
                  <a className="btn btn--primary" href={slide.ctaHref} tabIndex={i === index ? 0 : -1}>
                    {slide.cta}
                    <IconArrowRight size={18} />
                  </a>
                  <span className="slide__meta">{slide.meta}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="container hero__controls">
        <div className="hero__arrows">
          <button className="hero__arrow" onClick={() => go(index - 1)} aria-label="上一张">
            <IconChevronLeft size={20} />
          </button>
          <button className="hero__arrow" onClick={() => go(index + 1)} aria-label="下一张">
            <IconChevronRight size={20} />
          </button>
        </div>

        <div className="hero__dots">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              className={`hero__dot ${i === index ? 'is-active' : ''}`}
              onClick={() => go(i)}
              aria-label={`第 ${i + 1} 张：${slide.title}`}
            >
              <span className="hero__dot-index">{String(i + 1).padStart(2, '0')}</span>
              <span className="hero__dot-bar">
                <i
                  ref={i === index ? fillRef : null}
                  style={{ transform: 'scaleX(0)' }}
                />
              </span>
            </button>
          ))}
        </div>

        <span className="hero__counter">
          {String(index + 1).padStart(2, '0')}
          <i>/</i>
          {String(SLIDES.length).padStart(2, '0')}
        </span>
      </div>
    </section>
  )
}
