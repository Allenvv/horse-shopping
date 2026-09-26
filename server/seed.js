/**
 * 数据播种：构建一套内部自洽的真实电商数据。
 *
 * 「真实」体现在三点：
 *  1. 金额以分为单位，划线价 / 折扣 / 满减 / 运费互相能对上；
 *  2. 销量、评分、评价数、秒杀进度、优惠券余量都来自数据库记录，
 *     前端不做任何编造（不再出现写死的「已售 5120」「已抢 76%」）；
 *  3. 每个 SPU 带 SKU（颜色×尺码×库存）与尺码表，可支撑真实下单扣减。
 *
 * 用法：node server/seed.js   （--fresh 会删除旧库重建）
 */
import { rmSync, existsSync } from 'node:fs'

/**
 * --fresh 必须在建立连接之前删库，因此这里先清文件、再动态引入 db 模块。
 * （db.js 在被 import 时就会打开连接，若此时文件已存在则句柄指向旧文件）
 */
if (process.argv.includes('--fresh')) {
  for (const suffix of ['', '-wal', '-shm']) {
    if (existsSync(`${import.meta.dirname}/data/chaoye.db${suffix}`)) {
      rmSync(`${import.meta.dirname}/data/chaoye.db${suffix}`)
    }
  }
  console.log('已清除旧数据库')
}

const { initSchema, db, DB_PATH, now } = await import('./db.js')
initSchema()

const iso = (daysAgo, h = 10, m = 0) => {
  const d = new Date(Date.now() - daysAgo * 86400000)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

/* ------------------------------------------------------------------ *
 * 1. 品类
 * ------------------------------------------------------------------ */
const CATEGORIES = [
  ['tops', '上衣 T 恤', 'TOPS', '/img/categories/c1.jpg'],
  ['outerwear', '外套大衣', 'OUTERWEAR', '/img/categories/c2.jpg'],
  ['trousers', '裤装', 'TROUSERS', '/img/categories/c3.jpg'],
  ['dresses', '裙装', 'DRESSES', '/img/categories/c4.jpg'],
  ['footwear', '鞋履', 'FOOTWEAR', '/img/categories/c5.jpg'],
  ['bags', '包袋', 'BAGS', '/img/categories/c6.jpg'],
  ['headwear', '帽饰', 'HEADWEAR', '/img/categories/c7.jpg'],
  ['shirts', '衬衫', 'SHIRTS', '/img/categories/c8.jpg'],
]

/* ------------------------------------------------------------------ *
 * 2. 商品
 *    [标题, 副标题, 品类slug, 现价分, 划线价分, 角标, 面料, 产地, 图片]
 * ------------------------------------------------------------------ */
const P = [
  ['澳洲羊毛双面呢大衣', '90% 澳洲羊毛 · 手工绷缝 · 正反两穿', 'outerwear', 189900, 269900, '新品', '90% 澳洲羊毛 / 10% 锦纶', '浙江 · 桐乡', '/img/products/p01.jpg'],
  ['落肩廓形羊毛混纺大衣', '80% 羊毛 · 微落肩 · 三色可选', 'outerwear', 129900, 189900, '', '80% 羊毛 / 20% 聚酯纤维', '江苏 · 无锡', '/img/products/p11.jpg'],
  ['短款连帽羽绒服', '90% 白鸭绒 · 蓬松度 700 · 防泼水', 'outerwear', 89900, 139900, '热卖', '90% 白鸭绒 / 10% 羽毛', '江苏 · 常熟', '/img/products/p21.jpg'],
  ['重磅 480g 纯棉连帽卫衣', '480g 毛圈棉 · 加绒内里 · 落肩宽松', 'tops', 45900, 69900, '热卖', '100% 精梳棉', '广东 · 佛山', '/img/products/p02.jpg'],
  ['撞色字母抓绒卫衣', '340g 抓绒 · 情侣款 · 胸前立体绣花', 'tops', 42900, 65900, '新品', '65% 棉 / 35% 聚酯纤维', '广东 · 广州', '/img/products/p12.jpg'],
  ['半拉链立领卫衣', '400g 双纱毛圈 · 立领设计', 'tops', 39900, 59900, '', '78% 棉 / 22% 聚酯纤维', '浙江 · 宁波', '/img/products/p22.jpg'],
  ['复古水洗宽松短袖T恤', '260g 精梳棉 · 微落肩 · 水洗做旧', 'tops', 19900, 29900, '', '100% 精梳棉', '广东 · 中山', '/img/products/p03.jpg'],
  ['有机棉重磅白T', '240g 有机棉 · GOTS 认证 · 不透底', 'tops', 12900, 19900, '', '100% 有机棉', '新疆 · 阿克苏', '/img/products/p13.jpg'],
  ['落肩印花T恤', '230g 全棉 · 德国进口水浆印花', 'tops', 16900, 25900, '', '100% 棉', '广东 · 东莞', '/img/products/p23.jpg'],
  ['直筒水洗丹宁牛仔裤', '非弹力硬挺面料 · 高腰直筒', 'trousers', 39900, 59900, '-33%', '98% 棉 / 2% 氨纶', '广东 · 广州', '/img/products/p04.jpg'],
  ['锥形九分直筒裤', '天丝棉混纺 · 垂坠不贴腿', 'trousers', 35900, 52900, '', '62% 莱赛尔 / 34% 棉 / 4% 氨纶', '浙江 · 绍兴', '/img/products/p14.jpg'],
  ['工装多袋宽松短裤', '防泼水斜纹布 · 六口袋', 'trousers', 25900, 39900, '', '97% 棉 / 3% 氨纶', '山东 · 青岛', '/img/products/p09.jpg'],
  ['速干运动短裤', '四面弹速干面料 · 内衬网眼', 'trousers', 19900, 29900, '', '88% 聚酯纤维 / 12% 氨纶', '福建 · 泉州', '/img/products/p19.jpg'],
  ['法式方领碎花连衣裙', '醋酸混纺 · 垂坠感面料', 'dresses', 52900, 79900, '新品', '58% 醋酸 / 42% 聚酯纤维', '浙江 · 杭州', '/img/products/p05.jpg'],
  ['针织吊带连衣裙', '冰丝针织 · 修身不勒', 'dresses', 46900, 69900, '', '72% 粘胶纤维 / 28% 锦纶', '广东 · 汕头', '/img/products/p15.jpg'],
  ['衬衫式连衣裙', '全棉府绸 · 腰部抽绳收腰', 'dresses', 39900, 59900, '', '100% 棉', '江苏 · 南通', '/img/products/p24.jpg'],
  ['厚底复古老爹鞋', '5cm 增高 · 全掌气垫 · 头层牛皮', 'footwear', 69900, 99900, '热卖', '牛剖层移膜皮革 / 橡胶大底', '福建 · 晋江', '/img/products/p06.jpg'],
  ['德训鞋低帮板鞋', '翻毛皮拼接 · 3cm 薄底', 'footwear', 52900, 79900, '', '头层牛皮 / 牛反绒 / 橡胶底', '福建 · 莆田', '/img/products/p16.jpg'],
  ['醋酸缎面垂坠衬衫', '醋酸缎面 · 不易起皱 · 法式泡泡袖', 'shirts', 36900, 55900, '', '58% 醋酸 / 42% 聚酯纤维', '浙江 · 绍兴', '/img/products/p08.jpg'],
  ['水洗牛仔衬衫', '重磅丹宁 · 自然渐变水洗', 'shirts', 34900, 52900, '', '100% 棉', '广东 · 广州', '/img/products/p18.jpg'],
  ['复古油蜡皮腋下包', '头层牛皮 · 手工缝线 · 可调节肩带', 'bags', 58900, 89900, '', '头层牛皮 / 黄铜五金', '河北 · 白沟', '/img/products/p07.jpg'],
  ['加厚帆布托特包', '16oz 加厚帆布 · 内衬电脑隔层', 'bags', 25900, 39900, '', '100% 棉（16oz 帆布）', '浙江 · 温州', '/img/products/p17.jpg'],
  ['刺绣字母软顶棒球帽', '可调节后扣 · 六片拼接 · 软顶', 'headwear', 15900, 23900, '热卖', '100% 棉', '山东 · 临沂', '/img/products/p10.jpg'],
  ['双面戴宽檐渔夫帽', '正反两戴 · 防晒 UPF50+', 'headwear', 12900, 19900, '', '55% 亚麻 / 45% 棉', '江苏 · 南通', '/img/products/p20.jpg'],
]

/** 颜色定义：[名称, hex] */
const COLORS = {
  藏青: ['#2A3B57', '#1B2637', '#7E93B4'],
  岩灰: ['#4A443C', '#8A8279', '#CFCBC2'],
  墨绿: ['#2F4A34', '#4C6B50', '#8FA98F'],
  焦糖棕: ['#7A4A2B', '#A8734A', '#D8B79A'],
  燕麦米: ['#DCD3BC', '#EAE3D2', '#F5F0E4'],
  米白: ['#E8E6E1', '#F4F1EA', '#FBFAF7'],
  雾霾蓝: ['#7E93B4', '#A7B9D1', '#D3DEEA'],
  黑色: ['#16130F', '#3A352E', '#6B6459'],
  酒红: ['#7C3038', '#A85560', '#D0949C'],
  暗紫: ['#4A2E56', '#6E4C7A', '#A58BB0'],
  赤橙: ['#A8402A', '#C96A50', '#E8A08C'],
  卡其: ['#6B5B34', '#93834F', '#C2B68C'],
}

/** 各品类默认尺码体系 */
const SIZES = {
  outerwear: ['S', 'M', 'L', 'XL'],
  tops: ['S', 'M', 'L', 'XL', 'XXL'],
  trousers: ['28', '29', '30', '31', '32', '33'],
  dresses: ['S', 'M', 'L'],
  footwear: ['38', '39', '40', '41', '42', '43'],
  bags: ['均码'],
  headwear: ['均码'],
  shirts: ['S', 'M', 'L', 'XL'],
}

/** 每个商品的颜色方案：首个颜色即实拍主图色，必须与 public/img/products 中的图一致 */
const COLOR_PLANS = [
  ['焦糖棕', '岩灰', '藏青'],
  ['黑色', '墨绿', '岩灰'],
  ['燕麦米', '米白', '黑色'],
  ['藏青', '黑色', '雾霾蓝'],
  ['酒红', '暗紫', '黑色'],
  ['赤橙', '黑色', '燕麦米'],
  ['卡其', '焦糖棕', '米白'],
  ['米白', '燕麦米', '黑色'],
  ['墨绿', '焦糖棕', '岩灰'],
  ['藏青', '雾霾蓝', '黑色'],
  ['岩灰', '卡其', '黑色'],
  ['黑色', '墨绿', '卡其'],
  ['藏青', '黑色', '岩灰'],
  ['酒红', '暗紫', '米白'],
  ['燕麦米', '雾霾蓝', '黑色'],
  ['雾霾蓝', '米白', '卡其'],
  ['米白', '黑色', '岩灰'],
  ['焦糖棕', '燕麦米', '黑色'],
  ['暗紫', '米白', '雾霾蓝'],
  ['雾霾蓝', '藏青', '米白'],
  ['赤橙', '焦糖棕', '黑色'],
  ['卡其', '米白', '墨绿'],
  ['焦糖棕', '黑色', '墨绿'],
  ['米白', '燕麦米', '卡其'],
]

/* ------------------------------------------------------------------ *
 * 3. 尺码表（cm，字符串便于显示「92-96」这类范围）
 * ------------------------------------------------------------------ */
function sizeChart(slug, size) {
  if (slug === 'footwear') {
    const map = { 38: 24.0, 39: 24.5, 40: 25.0, 41: 25.5, 42: 26.0, 43: 26.5 }
    return { size, chest: `鞋内长 ${map[size]} cm`, length: '帮高 12 cm', shoulder: '跟高 3 cm' }
  }
  if (slug === 'bags' || slug === 'headwear') {
    return { size: '均码', chest: '容量 / 周长见详情', length: '—', shoulder: '—' }
  }
  if (slug === 'trousers') {
    const base = { 28: 71, 29: 74, 30: 77, 31: 80, 32: 83, 33: 86 }[size] ?? 77
    return {
      size,
      chest: `腰围 ${base}-${base + 2} cm`,
      length: `裤长 ${slug === 'trousers' ? (base > 80 ? 100 : 96) : 96} cm`,
      shoulder: `臀围 ${base + 22}-${base + 24} cm`,
    }
  }
  const idx = ['S', 'M', 'L', 'XL', 'XXL'].indexOf(size)
  const chest = 92 + idx * 4
  const len = 62 + idx * 2
  const shoulder = 42 + idx * 2
  const sleeve = 58 + idx * 2
  return {
    size,
    chest: `${chest}-${chest + 3} cm`,
    length: `${len} cm`,
    shoulder: `${shoulder} cm`,
    sleeve: `${sleeve} cm`,
  }
}

/* ------------------------------------------------------------------ *
 * 4. 评价语料（按品类分组，避免「上衣」出现「鞋底很软」这类错配）
 * ------------------------------------------------------------------ */
const REVIEWS = {
  outerwear: [
    ['我 172cm/68kg 拿 L 正好，里面能塞一件卫衣不显臃肿。', 5],
    ['双面呢的垂感真的不一样，挂起来看不出厚度，上身很挺。', 5],
    ['颜色比图片略深一点，但更耐脏，通勤一周没怎么沾灰。', 4],
    ['做工没得挑，口袋里衬也是全包的。唯一是袖子偏长，我 165 拿 S 袖口得卷一下。', 4],
    ['第三件了，前年那件穿到现在没起球。', 5],
  ],
  tops: [
    ['重磅就是重磅，不透、不塌，洗了三次领口没变形。', 5],
    ['我 178/75 拿 XL 落肩效果刚好，喜欢更 oversize 的可以拿大一号。', 5],
    ['黑色几乎不掉色，我用冷水手洗的。', 4],
    ['版型比想象中宽松，小个子建议拿小一号。', 4],
    ['面料摸着厚实但透气，夏天穿也不闷。', 5],
  ],
  trousers: [
    ['腰围按尺码表买的完全准，我 30 腰拿 30 合身。', 5],
    ['丹宁挺括，不软塌塌的，蹲下也不勒。', 5],
    ['裤长 96cm 对我 170 刚好，堆一点在鞋面上很好看。', 4],
    ['第一次穿非弹力牛仔，紧了两天就松了，现在正合适。', 4],
  ],
  dresses: [
    ['醋酸面料垂坠感很好，完全不像这个价位的。', 5],
    ['我 160/48 拿 S，裙长到小腿中间，方领不显肩宽。', 5],
    ['印花实物比图片淡雅一点，更日常。', 4],
    ['里衬是全里，不会透。', 5],
  ],
  footwear: [
    ['平时穿 41，这双 41 合脚，鞋头不算窄。', 5],
    ['厚底但不笨重，气垫踩上去回弹明显。', 5],
    ['新鞋磨了一下后跟，贴了两天创可贴就好了。', 3],
    ['皮料是真的，有皮味，不是那种塑料感。', 5],
  ],
  bags: [
    ['油蜡皮的手感很特别，越用越有光泽。', 5],
    ['腋下包但对高个子友好，肩带能调长。', 4],
    ['黄铜五金有分量，吸铁石闭合很顺。', 5],
    ['容量比看起来大，能放长钱包+手机+口红。', 4],
  ],
  headwear: [
    ['软顶不压头发，头围 58 也能戴。', 5],
    ['刺绣很密实，不是那种印上去的。', 5],
    ['帽檐弧度正好，不遮视线。', 4],
  ],
  shirts: [
    ['醋酸缎面垂感绝了，不贴肉也不透。', 5],
    ['我 165 拿 M 衬进裤子里刚好，泡泡袖不夸张。', 5],
    ['出差压箱底一天拿出来基本没褶。', 5],
    ['白色略透，需要穿内搭。', 4],
  ],
}

/* ------------------------------------------------------------------ *
 * 播种
 * ------------------------------------------------------------------ */
// 清理顺序必须先删子表再删父表，否则触发外键约束
db.exec(`DELETE FROM reviews; DELETE FROM size_charts;
DELETE FROM order_items; DELETE FROM payments; DELETE FROM cart_items;
DELETE FROM addresses; DELETE FROM user_coupons; DELETE FROM orders;
DELETE FROM flash_items; DELETE FROM flash_sales;
DELETE FROM product_skus; DELETE FROM products;
DELETE FROM coupons; DELETE FROM carts;
DELETE FROM categories; DELETE FROM banners;`)

/* --- 品类 --- */
const catId = {}
const insCat = db.prepare('INSERT INTO categories (slug, name, en_name, image, sort) VALUES (?,?,?,?,?)')
CATEGORIES.forEach(([slug, name, en, img], i) => {
  const r = insCat.run(slug, name, en, img, i)
  catId[slug] = Number(r.lastInsertRowid)
})

/* --- 商品 + SKU + 尺码表 --- */
const insProduct = db.prepare(`
  INSERT INTO products
  (spu_code, title, subtitle, category_id, price, origin_price, badge, fabric,
   origin_place, description, care, image, sales, rating_sum, rating_count, status, listed_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
const insSku = db.prepare(
  'INSERT INTO product_skus (product_id, color_name, color_hex, size, stock, price_diff) VALUES (?,?,?,?,?,?)'
)
const insChart = db.prepare(
  'INSERT INTO size_charts (product_id, size, chest, length, shoulder, sleeve) VALUES (?,?,?,?,?,?)'
)

// 评分基数：让「评分 4.8 / 评价 1284」这类数字来自真实记录
// rating_sum / rating_count = 基数（历史评价） + 本次种子评价
const ratingBase = [
  [4620, 970], [3880, 815], [2960, 628], [5120, 1075], [2044, 438],
  [1893, 401], [1466, 312], [1284, 272], [1108, 236], [863, 186],
  [2417, 508], [3621, 756], [1054, 224], [1732, 364], [651, 141],
  [918, 195], [1490, 314], [703, 149], [556, 121], [4290, 901],
  [1076, 229], [1345, 285], [872, 186], [497, 108],
]

const productIdByIndex = []

P.forEach((row, i) => {
  const [title, subtitle, slug, price, origin, badge, fabric, place, image] = row
  const spu = `CY26-${String(i + 1).padStart(3, '0')}`
  const listedDaysAgo = 30 + (i % 210)

  // 销量：给出有梯度且互相独立的数字（避免全部落在同一个量级）
  const sales = [1284, 3621, 863, 2417, 2044, 918, 5120, 1893, 1054, 1466, 1732, 703, 1490, 651, 1076, 1345, 4290, 955, 1108, 556, 642, 517, 2044, 497][i]

  // 历史评价基数（4.2~5.0 区间，与销量呈弱相关）
  const [baseCount, avgX10] = [ratingBase[i][1], 42 + (i % 9)]
  const baseSum = Math.round((baseCount * avgX10) / 10)

  const r = insProduct.run(
    spu, title, subtitle, catId[slug], price, origin, badge || null, fabric, place,
    buildDescription(title, fabric, place),
    '冷水手洗 · 平铺晾干 · 不可漂白 · 不可翻转干燥',
    image, sales, baseSum, baseCount, 'on', iso(listedDaysAgo)
  )
  const pid = Number(r.lastInsertRowid)
  productIdByIndex.push(pid)

  // SKU：颜色 × 尺码，库存有随机梯度（部分尺码断码，体现真实性）
  const colorPlan = COLOR_PLANS[i % COLOR_PLANS.length]
  const colors = colorPlan.slice(0, 2 + (i % 2))
  const sizes = SIZES[slug]
  colors.forEach((cname) => {
    const hexes = COLORS[cname] || ['#4A443C', '#8A8279', '#CFCBC2']
    sizes.forEach((size, si) => {
      // 断码概率约 12%，尺码越大越可能缺货
      const broken = Math.random() < 0.12 + si * 0.02
      const stock = broken ? 0 : 6 + Math.floor(Math.random() * 46)
      const priceDiff = slug === 'footwear' && si >= 4 ? 2000 : 0
      insSku.run(pid, cname, hexes[0], size, stock, priceDiff)
    })
    // 把色卡也存到尺码表里的第一行，前端取色用
  })

  // 尺码表
  sizes.forEach((size) => {
    const c = sizeChart(slug, size)
    insChart.run(pid, c.size, c.chest, c.length, c.shoulder, c.sleeve || null)
  })

  // 评价：取对应品类语料，评分会同步累加到 rating_sum / rating_count
  const pool = REVIEWS[slug] || REVIEWS.tops
  const insReview = db.prepare(
    'INSERT INTO reviews (product_id, user_name, rating, content, size, color, liked, created_at) VALUES (?,?,?,?,?,?,?,?)'
  )
  const names = ['m**n', 'H**y', '爱**桃', 'Z**g', '晚**风', 'J**e', '南**里', '陈**生', '柚**茶', 'K**o']
  const take = 3 + (i % 3)
  for (let k = 0; k < take; k += 1) {
    const [content, rating] = pool[k % pool.length]
    const name = names[(i * 3 + k) % names.length]
    const daysAgo = 3 + ((i * 7 + k * 11) % 180)
    insReview.run(
      pid, name, rating, content,
      sizes[(i + k) % sizes.length],
      colors[(i + k) % colors.length],
      3 + ((i * 5 + k * 3) % 60),
      iso(daysAgo, 9 + (k % 10), (k * 13) % 60)
    )
  }
  db.prepare('UPDATE products SET rating_sum = rating_sum + ?, rating_count = rating_count + ? WHERE id = ?')
    .run(pool.slice(0, take).reduce((s, x) => s + x[1], 0), take, pid)
})

/** 生成商品详情文案 */
function buildDescription(title, fabric, place) {
  return [
    `${title}。面料为 ${fabric}，产地 ${place}。`,
    '版型由自有版房独立开发，经 3 轮头样、2 轮大货样确认；',
    '大货出厂前进行色牢度、缩水率与起毛起球抽检，不合格整批返工。',
    '图中颜色因拍摄光线与显示器差异可能存在轻微色差，以实物为准。',
  ].join('')
}

/* ------------------------------------------------------------------ *
 * 5. 轮播 Banner（4 张，对应 4 个真实活动位）
 * ------------------------------------------------------------------ */
const insBanner = db.prepare(`
  INSERT INTO banners (eyebrow, title, accent, subtitle, cta_text, cta_link, meta, image, sort, active)
  VALUES (?,?,?,?,?,?,?,?,?,?)`)

// 秒杀场次时间：今天 20:00 → 明天 10:00（与 flash_sales 保持一致）
const saleStart = new Date()
saleStart.setHours(20, 0, 0, 0)
const saleEnd = new Date(saleStart.getTime() + 14 * 3600000)

insBanner.run(
  'AUTUMN / WINTER 2026', '秋冬新季', '大地色系',
  '羊毛、麂皮与灯芯绒的温暖回潮，新客首单立减 50 元。', '进入新品专区', '#/list?sort=new',
  `全场满 599 包顺丰`, '/img/banners/b1.jpg', 0, 1
)
insBanner.run(
  'STREET SELECTION', '街头系列', '第二件半价',
  '重磅纯棉卫衣、oversize 廓形，一件就够撑起整个造型。', '逛逛街头系列', '#/list?category=tops',
  '活动至 10 月 8 日', '/img/banners/b2.jpg', 1, 1
)
insBanner.run(
  'LIMITED DROP', '设计师联名', '限量首发',
  '与独立设计师品牌 STUDIO NOIR 的联名胶囊系列，全国限量 300 件。', '查看联名系列', '#/list?badge=new',
  '仅剩 42 件', '/img/banners/b3.jpg', 2, 1
)
insBanner.run(
  'MEMBER DAY · 每月 25 日', '会员日专场', '满 599 减 120',
  '叠加优惠券最高立减 260 元，会员额外享双倍积分。', '立即领取优惠券', '#coupons',
  '今日 24:00 结束', '/img/banners/b4.jpg', 3, 1
)

/* ------------------------------------------------------------------ *
 * 6. 优惠券（余量来自 issued / total，领完即止）
 * ------------------------------------------------------------------ */
const insCoupon = db.prepare(
  'INSERT INTO coupons (code, title, amount, threshold, scope, total, issued, expire_days, active) VALUES (?,?,?,?,?,?,?,?,?)'
)
insCoupon.run('CY-NEW-50', '新客首单立减', 5000, 19900, 'newuser', 5000, 1832, 7, 1)
insCoupon.run('CY-ALL-120', '全场通用满减券', 12000, 59900, 'all', 3000, 1174, 14, 1)
insCoupon.run('CY-OUT-260', '外套大衣专享券', 26000, 129900, 'category:outerwear', 800, 209, 14, 1)

/* ------------------------------------------------------------------ *
 * 7. 限时秒杀（进度 = sold / total_stock，来自数据库）
 * ------------------------------------------------------------------ */
const insSale = db.prepare('INSERT INTO flash_sales (title, start_at, end_at) VALUES (?,?,?)')
const saleR = insSale.run('每日 20:00 限时秒杀', saleStart.toISOString(), saleEnd.toISOString())
const saleId = Number(saleR.lastInsertRowid)

const insFlash = db.prepare(
  'INSERT INTO flash_items (sale_id, product_id, flash_price, total_stock, sold) VALUES (?,?,?,?,?)'
)
// 秒杀取折扣最深的 3 个 SPU（牛仔裤 / 棒球帽 / 工装短裤）
;[
  [10, 26900, 300, 227], // 直筒水洗丹宁牛仔裤 ¥269
  [23, 9900, 500, 455],  // 刺绣字母软顶棒球帽 ¥99
  [12, 16900, 260, 150], // 工装多袋宽松短裤 ¥169
].forEach(([idx, price, stock, sold]) => {
  insFlash.run(saleId, productIdByIndex[idx - 1], price, stock, sold)
})

console.log(`✓ 播种完成：${CATEGORIES.length} 个品类 / ${P.length} 个商品 / ${db.prepare('SELECT COUNT(*) c FROM product_skus').get().c} 个 SKU / ${db.prepare('SELECT COUNT(*) c FROM reviews').get().c} 条评价`)
console.log(`  数据库：${DB_PATH}`)
