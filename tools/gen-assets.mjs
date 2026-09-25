/**
 * 潮野 CHAOYE — 本地 SVG 视觉素材生成器
 *
 * 为什么不用外部图床：离线可用、体积小、风格统一、无版权风险。
 * 运行：node tools/gen-assets.mjs
 *
 * 坐标系统一：单品画布 300x400（衣物轮廓按此网格手工绘制），
 * 生成时通过 viewBox / transform 复用到大图、分类图、促销图上。
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'img')

/* ------------------------------------------------------------------ *
 * 1. 衣物轮廓（fill 用的主体路径）
 * ------------------------------------------------------------------ */
const BODY = {
  // 短袖 T 恤
  tee: 'M100 118 C115 142 185 142 200 118 L240 138 L258 192 L226 204 L216 172 L216 302 L84 302 L84 172 L74 204 L42 192 L60 138 Z',
  // 长袖衬衫
  shirt:
    'M100 118 C115 142 185 142 200 118 L236 136 L262 268 L236 276 L220 180 L220 322 L80 322 L80 180 L64 276 L38 268 L64 136 Z',
  // 长款风衣 / 大衣
  coat: 'M104 116 C118 140 182 140 196 116 L238 134 L262 258 L238 266 L222 178 L236 352 L64 352 L78 178 L62 266 L38 258 L62 134 Z',
  // 长裤
  jeans: 'M92 110 L208 110 L214 190 L200 350 L156 350 L150 232 L144 350 L100 350 L86 190 Z',
  // 短裤
  shorts: 'M92 140 L208 140 L212 200 L200 292 L158 292 L150 224 L142 292 L100 292 L88 200 Z',
  // 连衣裙
  dress: 'M118 116 C132 142 168 142 182 116 L196 124 L208 168 L196 196 L250 340 L50 340 L104 196 L92 168 Z',
  // 棒球帽（帽冠 + 向右前方伸出的帽檐，纯剪影更易辨认）
  cap: 'M84 248 C84 158 216 158 216 248 Z M214 240 L282 249 C288 270 252 282 208 273 Z',
  // 手提包
  bag: 'M68 182 L232 182 C244 182 252 192 252 206 L252 320 C252 334 244 344 232 344 L68 344 C56 344 48 334 48 320 L48 206 C48 192 56 182 68 182 Z',
  // 运动鞋（鞋面 + 鞋底两个子路径）
  sneaker:
    'M44 278 L44 254 C44 236 62 228 84 224 L136 216 C158 212 172 202 186 188 C200 174 222 168 238 176 C256 186 262 210 262 242 L262 278 Z M32 274 L268 274 C276 280 274 300 266 300 L34 300 C26 300 24 280 32 274 Z',
  // 卫衣
  hoodie:
    'M96 136 C100 92 200 92 204 136 L238 152 L262 272 L236 280 L222 186 L222 322 L78 322 L78 186 L64 280 L38 272 L62 152 Z',
}

/* 各轮廓的近似包围盒（用于自动缩放居中） */
const BBOX = {
  tee: [42, 116, 258, 302],
  shirt: [38, 116, 262, 322],
  coat: [38, 116, 262, 352],
  jeans: [86, 110, 214, 350],
  shorts: [88, 140, 212, 292],
  dress: [50, 116, 250, 340],
  cap: [84, 158, 288, 282],
  bag: [48, 128, 252, 344],
  sneaker: [24, 168, 276, 300],
  hoodie: [38, 92, 262, 322],
}

/** 把某个轮廓缩放并居中到目标矩形 (tx,ty,tw,th) 内 */
const fit = (name, tx, ty, tw, th) => {
  const [x0, y0, x1, y1] = BBOX[name]
  const w = x1 - x0
  const h = y1 - y0
  const scale = Math.min(tw / w, th / h)
  return {
    scale,
    dx: tx + (tw - w * scale) / 2 - x0 * scale,
    dy: ty + (th - h * scale) / 2 - y0 * scale,
  }
}

/* ------------------------------------------------------------------ *
 * 2. 轮廓上的细节（走线、口袋、鞋带等）——以 stroke 绘制
 * ------------------------------------------------------------------ */
const DETAIL = {
  tee: [{ d: 'M100 118 C115 142 185 142 200 118', w: 7 }],
  shirt: [
    { d: 'M100 118 C115 142 185 142 200 118', w: 7 },
    { d: 'M150 150 L150 322', w: 5, dash: '1 0' },
    { d: 'M104 122 L150 152 L196 122', w: 6 },
    { d: 'M104 122 L104 322', w: 4, op: 0.5 },
    { d: 'M196 122 L196 322', w: 4, op: 0.5 },
  ],
  coat: [
    { d: 'M104 116 C118 140 182 140 196 116', w: 7 },
    { d: 'M150 156 L150 352', w: 6 },
    { d: 'M104 120 L150 172 L196 120', w: 7 },
    { d: 'M214 240 L186 240', w: 5, op: 0.55 },
    { d: 'M86 240 L114 240', w: 5, op: 0.55 },
  ],
  jeans: [
    { d: 'M92 122 L208 122', w: 6, op: 0.6 },
    { d: 'M150 232 L150 128', w: 5, op: 0.45 },
    { d: 'M118 140 C120 180 118 230 114 290', w: 4, op: 0.35 },
    { d: 'M182 140 C180 180 182 230 186 290', w: 4, op: 0.35 },
  ],
  shorts: [
    { d: 'M92 152 L208 152', w: 6, op: 0.6 },
    { d: 'M150 224 L150 158', w: 5, op: 0.45 },
  ],
  dress: [
    { d: 'M118 116 C132 142 168 142 182 116', w: 7 },
    { d: 'M94 196 L206 196', w: 7 },
    { d: 'M118 122 L118 340', w: 3, op: 0.28 },
    { d: 'M182 122 L182 340', w: 3, op: 0.28 },
  ],
  // 帽冠不描边（描边会造成光晕、割裂帽檐），只用一条缝线暗示结构
  cap: [{ d: 'M150 172 L150 240', w: 3, op: 0.22 }],
  bag: [
    { d: 'M108 186 C108 130 192 130 192 186', w: 13 },
    { d: 'M48 232 L252 232', w: 5, op: 0.4 },
  ],
  sneaker: [
    { d: 'M150 240 L176 208', w: 6, op: 0.7 },
    { d: 'M128 246 L152 216', w: 6, op: 0.7 },
    { d: 'M106 250 L128 224', w: 6, op: 0.7 },
    { d: 'M44 268 L262 268', w: 4, op: 0.45 },
  ],
  hoodie: [
    { d: 'M96 136 C100 92 200 92 204 136', w: 8 },
    { d: 'M118 140 C124 168 176 168 182 140', w: 5, op: 0.5 },
    { d: 'M108 322 L192 322', w: 6, op: 0.4 },
    { d: 'M118 244 L182 244 L182 296 L118 296 Z', w: 5, op: 0.35 },
  ],
}

/* ------------------------------------------------------------------ *
 * 3. 调色板
 * ------------------------------------------------------------------ */
const P = {
  clay: { bg: ['#F3E7DC', '#E4CDB9'], fg: '#7A4A2B' },
  ink: { bg: ['#E8E6E1', '#CFCBC2'], fg: '#16130F' },
  moss: { bg: ['#E3EADF', '#C6D5C0'], fg: '#2F4A34' },
  rose: { bg: ['#F6E4E4', '#E8C6C9'], fg: '#7C3038' },
  denim: { bg: ['#E1E7EF', '#C1CDDE'], fg: '#2A3B57' },
  sand: { bg: ['#F2EEE3', '#DCD3BC'], fg: '#6B5B34' },
  plum: { bg: ['#EBE2EE', '#D3C2D9'], fg: '#4A2E56' },
  steel: { bg: ['#E5E8EA', '#C4CBD0'], fg: '#33414A' },
  amber: { bg: ['#FBEEDA', '#EFD4A6'], fg: '#8A5A16' },
  coral: { bg: ['#FDE7E0', '#F3C6B6'], fg: '#A8402A' },
}

/* ------------------------------------------------------------------ *
 * 4. 通用工具
 * ------------------------------------------------------------------ */
const rnd = (seed) => {
  // 简单确定性伪随机，保证每次生成结果一致
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

const grad = (id, [c1, c2], angle = 135) => {
  const rad = (angle * Math.PI) / 180
  const x = Math.cos(rad) * 0.5
  const y = Math.sin(rad) * 0.5
  return `<linearGradient id="${id}" x1="${0.5 - x}" y1="${0.5 - y}" x2="${0.5 + x}" y2="${0.5 + y}">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient>`
}

/** 细点阵纹理，让色块不那么平 */
const dots = (w, h, color, op = 0.16, step = 14) =>
  `<pattern id="dots" width="${step}" height="${step}" patternUnits="userSpaceOnUse">
      <circle cx="1.4" cy="1.4" r="1.4" fill="${color}" opacity="${op}"/>
    </pattern>`

const shapeSvg = (name, { fill, stroke, scale = 1, dx = 0, dy = 0, detailColor, detailOpacity = 1 }) => {
  const body = `<path d="${BODY[name]}" fill="${fill}"/>`
  const details = (DETAIL[name] || [])
    .map(
      (d) =>
        `<path d="${d.d}" fill="none" stroke="${detailColor || stroke}" stroke-width="${d.w}" stroke-linecap="round" opacity="${(d.op ?? 1) * detailOpacity}"/>`
    )
    .join('')
  return `<g transform="translate(${dx} ${dy}) scale(${scale})">${body}${details}</g>`
}

const write = (rel, svg) => {
  const p = join(OUT, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, svg.replace(/\n\s+/g, '\n').trim())
}

/* ------------------------------------------------------------------ *
 * 5. 轮播大图 1600x800
 * ------------------------------------------------------------------ */
const SLIDES = [
  { file: 'slide-1.svg', shape: 'coat', pal: P.clay, seed: 11, tag: 'AUTUMN / WINTER 26' },
  { file: 'slide-2.svg', shape: 'hoodie', pal: P.moss, seed: 27, tag: 'STREET SELECTION' },
  { file: 'slide-3.svg', shape: 'dress', pal: P.plum, seed: 43, tag: 'LIMITED DROP' },
  { file: 'slide-4.svg', shape: 'sneaker', pal: P.steel, seed: 61, tag: 'MEMBER DAY' },
]

const genSlide = ({ shape, pal, seed, tag }) => {
  const R = rnd(seed)
  const [c1, c2] = pal.bg
  const blobs = Array.from({ length: 3 }, () => {
    const cx = 780 + R() * 700
    const cy = 120 + R() * 560
    const r = 120 + R() * 200
    return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="${pal.fg}" opacity="0.05"/>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 800" width="1600" height="800" role="img" aria-label="${tag}">
  <defs>
    ${grad('bg', [c1, c2], 120)}
    ${dots(1600, 800, pal.fg, 0.1)}
    <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c1}" stop-opacity="0.96"/>
      <stop offset="0.6" stop-color="${c1}" stop-opacity="0.7"/>
      <stop offset="1" stop-color="${c1}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="800" fill="url(#bg)"/>
  <rect width="1600" height="800" fill="url(#dots)"/>
  ${blobs}
  <!-- 右侧几何框架，杂志感 -->
  <rect x="700" y="70" width="830" height="660" fill="none" stroke="${pal.fg}" stroke-width="1.5" opacity="0.22"/>
  <rect x="742" y="112" width="746" height="576" fill="#FFFFFF" opacity="0.34"/>
  ${shapeSvg(shape, { ...fit(shape, 800, 165, 640, 470), fill: pal.fg, stroke: pal.fg, detailColor: c1 })}
  <!-- 左侧文字可读性蒙版（止于 780，不污染右侧单品） -->
  <rect width="780" height="800" fill="url(#scrim)"/>
  <text x="96" y="716" font-family="Helvetica,Arial,sans-serif" font-size="20" letter-spacing="7" fill="${pal.fg}" opacity="0.6">${tag}</text>
</svg>`
}

SLIDES.forEach((s) => write(s.file, genSlide(s)))

/* ------------------------------------------------------------------ *
 * 6. 分类图标 400x400
 * ------------------------------------------------------------------ */
const CATS = [
  { file: 'cat-tee.svg', shape: 'tee', pal: P.clay },
  { file: 'cat-coat.svg', shape: 'coat', pal: P.ink },
  { file: 'cat-pants.svg', shape: 'jeans', pal: P.denim },
  { file: 'cat-dress.svg', shape: 'dress', pal: P.rose },
  { file: 'cat-shoes.svg', shape: 'sneaker', pal: P.steel },
  { file: 'cat-bag.svg', shape: 'bag', pal: P.sand },
  { file: 'cat-cap.svg', shape: 'cap', pal: P.moss },
  { file: 'cat-shirt.svg', shape: 'shirt', pal: P.plum },
]

const genCat = ({ shape, pal }, i) => {
  const [c1, c2] = pal.bg
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img">
  <defs>${grad('g' + i, [c1, c2], 140)}</defs>
  <rect width="400" height="400" fill="url(#g${i})"/>
  <circle cx="330" cy="72" r="120" fill="${pal.fg}" opacity="0.06"/>
  ${shapeSvg(shape, { ...fit(shape, 62, 62, 276, 276), fill: pal.fg, stroke: pal.fg, detailColor: c1 })}
</svg>`
}

CATS.forEach((c, i) => write(c.file, genCat(c, i)))

/* ------------------------------------------------------------------ *
 * 7. 商品图 600x800（3:4 竖图）
 * ------------------------------------------------------------------ */
const PRODUCTS = [
  { shape: 'coat', pal: P.clay },
  { shape: 'hoodie', pal: P.ink },
  { shape: 'tee', pal: P.sand },
  { shape: 'jeans', pal: P.denim },
  { shape: 'dress', pal: P.rose },
  { shape: 'sneaker', pal: P.steel },
  { shape: 'bag', pal: P.coral },
  { shape: 'shirt', pal: P.plum },
  { shape: 'shorts', pal: P.moss },
  { shape: 'cap', pal: P.amber },
  { shape: 'coat', pal: P.steel },
  { shape: 'hoodie', pal: P.rose },
  { shape: 'tee', pal: P.moss },
  { shape: 'jeans', pal: P.ink },
  { shape: 'dress', pal: P.plum },
  { shape: 'sneaker', pal: P.clay },
  { shape: 'bag', pal: P.sand },
  { shape: 'shirt', pal: P.denim },
  { shape: 'shorts', pal: P.sand },
  { shape: 'cap', pal: P.ink },
  { shape: 'coat', pal: P.rose },
  { shape: 'hoodie', pal: P.moss },
  { shape: 'tee', pal: P.coral },
  { shape: 'dress', pal: P.steel },
]

const genProduct = ({ shape, pal }, i) => {
  const [c1, c2] = pal.bg
  const R = rnd(100 + i * 7)
  const ring = 300 + R() * 120
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800" role="img">
  <defs>${grad('g' + i, [c1, c2], 160)}</defs>
  <rect width="600" height="800" fill="url(#g${i})"/>
  <circle cx="300" cy="392" r="${ring.toFixed(0)}" fill="#FFFFFF" opacity="0.42"/>
  <circle cx="300" cy="392" r="${ring.toFixed(0)}" fill="none" stroke="${pal.fg}" stroke-width="1" opacity="0.16"/>
  ${shapeSvg(shape, { ...fit(shape, 104, 148, 392, 504), fill: pal.fg, stroke: pal.fg, detailColor: c1 })}
</svg>`
}

PRODUCTS.forEach((p, i) => write(`p-${i + 1}.svg`, genProduct(p, i)))

/* ------------------------------------------------------------------ *
 * 8. 促销活动位配图 600x600
 *    背景使用与卡片底色完全一致的纯色，放进卡片后可无缝融合
 * ------------------------------------------------------------------ */
const genPromo = (file, shape, pal, seed) => {
  const R = rnd(seed)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img">
  <defs>${dots(600, 600, pal.fg, 0.09)}</defs>
  <rect width="600" height="600" fill="${pal.bg[0]}"/>
  <rect width="600" height="600" fill="url(#dots)"/>
  <circle cx="${(140 + R() * 80).toFixed(0)}" cy="${(150 + R() * 90).toFixed(0)}" r="150" fill="${pal.fg}" opacity="0.06"/>
  <circle cx="300" cy="300" r="196" fill="#FFFFFF" opacity="0.5"/>
  ${shapeSvg(shape, { ...fit(shape, 130, 130, 340, 340), fill: pal.fg, stroke: pal.fg, detailColor: pal.bg[0] })}
</svg>`
}

write('promo-1.svg', genPromo('promo-1.svg', 'coat', P.clay, 91))
write('promo-2.svg', genPromo('promo-2.svg', 'bag', P.amber, 137))

/* ------------------------------------------------------------------ *
 * 9. 品牌 Logo 标记（SVG 图形部分，文字由 HTML 渲染）
 * ------------------------------------------------------------------ */
write(
  'logo-mark.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect width="48" height="48" rx="12" fill="#16130F"/>
  <path d="M14 34 L24 14 L34 34" fill="none" stroke="#FBFAF7" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M19.5 27 H28.5" fill="none" stroke="#E8502F" stroke-width="3.4" stroke-linecap="round"/>
</svg>`
)

console.log('✓ SVG 素材已生成到 public/img/')
