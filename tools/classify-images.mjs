/**
 * 生成图归类器
 *
 * 背景：图像生成工具在并行调用时会把多张图落到同一目录、且文件名带秒级时间戳，
 * 因此「文件 → 商品」的对应关系无法从文件名推断。若靠猜，就会出现
 * 「藏青卫衣」被放到「羊毛大衣」卡片上的错误。
 *
 * 做法：读图片主体区域（排除近白背景）的主色，与每个槽位的期望色做最近邻匹配，
 * 输出一一对应的映射并给出置信度；只有唯一匹配才写盘，有歧义就报出来人工处理。
 *
 * 用法：node tools/classify-images.mjs <源目录> <期望清单.json> [输出目录]
 *   期望清单：[{ "slot": "p01", "color": "#7A4A2B" }, ...]
 *
 * 提示：让每条生成 prompt 以「服装名」开头（而非统一的 "Professional e-commerce..."），
 * 生成文件名即随服装名变化，可从根上避免并行调用文件名撞车导致的覆盖丢失。
 */
import { spawn } from 'node:child_process'
import { readdirSync, readFileSync, renameSync, mkdirSync } from 'node:fs'
import { join, basename, extname } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9342
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const [, , dir, planPath, outDir] = process.argv
if (!dir || !planPath) {
  console.error('用法：node tools/classify-images.mjs <源目录> <期望清单.json> [输出目录]')
  process.exit(1)
}

const plan = JSON.parse(readFileSync(planPath, 'utf8'))
const files = readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f)).map((f) => join(dir, f))
if (!files.length) {
  console.error('目录中没有图片')
  process.exit(1)
}

/* ------------------------------------------------------------ 颜色工具 */
const hexToRgb = (hex) => {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/**
 * 颜色表征：色相 h(0-360) + 色度 c(=max-min, 0-255) + 明度 l(=(max+min)/2, 0-255)
 *
 * 为什么不用 HSL 的饱和度比值：近白色时比值极其敏感——米白 (236,232,227)
 * 只有 9 个色阶差，却算出 s=0.19，而期望色 #E8E6E1 算出 0.13，
 * 于是同一件米白 T 恤被误判为「一个中性一个有色」。用绝对色度就没有这个问题。
 */
function rgbToHcl([r, g, b]) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const c = max - min
  const l = (max + min) / 2
  if (c === 0) return [0, 0, l]
  let h
  if (max === r) h = ((g - b) / c + (g < b ? 6 : 0)) * 60
  else if (max === g) h = ((b - r) / c + 2) * 60
  else h = ((r - g) / c + 4) * 60
  return [h, c, l]
}

/** 色度低于此值视为黑白灰，色相无意义 */
const NEUTRAL_CHROMA = 18

/**
 * 感知色距。三条分支：
 *  1. 双方中性（黑/白/灰）→ 只比明度与色度
 *  2. 一方中性、一方有彩 → 不可能是同一件衣服，给一个远高于正常匹配的惩罚项
 *     （早先这里只忽略中性方的色相，导致灰色裤子因明度接近而被判成卡其色）
 *  3. 双方有彩 → 色相主导；明度权重压低，因为棚拍打光主要改变明度而非色相
 */
function colorDist(a, b) {
  const [h1, c1, l1] = rgbToHcl(a)
  const [h2, c2, l2] = rgbToHcl(b)
  const n1 = c1 < NEUTRAL_CHROMA
  const n2 = c2 < NEUTRAL_CHROMA

  if (n1 && n2) return Math.abs(l1 - l2) * 1.5 + Math.abs(c1 - c2)
  if (n1 !== n2) return 220 + Math.abs(l1 - l2) * 0.8 + Math.abs(c1 - c2)

  let dh = Math.abs(h1 - h2)
  if (dh > 180) dh = 360 - dh
  return dh * 3.2 + Math.abs(c1 - c2) * 1.2 + Math.abs(l1 - l2) * 0.5
}

/* ------------------------------------------------------------ 读图取色 */
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-proxy-server',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=/tmp/cdp-classify', 'about:blank'], { stdio: 'ignore' })

let ws
try {
  let v
  for (let i = 0; i < 40; i++) { try { v = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break } catch { await sleep(250) } }
  ws = new WebSocket(v.webSocketDebuggerUrl)
  await new Promise((r) => { ws.onopen = r })
  let id = 0; const pend = new Map()
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const { resolve, reject } = pend.get(m.id); pend.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result) } }
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const mid = ++id; pend.set(mid, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id: mid, method, params, sessionId })) })
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const call = (m, p) => send(m, p, sessionId)
  await call('Page.enable'); await call('Runtime.enable')
  const js = async (expr) => {
    const { result, exceptionDetails } = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description)
    return result.value
  }

  const measured = []
  for (const f of files) {
    const b64 = readFileSync(f).toString('base64')
    const mime = f.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
    const out = await js(`(async () => {
      const img = new Image();
      img.src = 'data:${mime};base64,${b64}';
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;

      // 采样区：去掉最下方 10%（棚拍投影都在那里），避免投影把浅色衣物拉暗
      const yEnd = Math.floor(c.height * 0.9);
      const total = c.width * c.height;

      // 按 4bit/通道 量化统计众数色（主色簇），比求均值更能代表面料本色
      const bins = new Map();
      let subject = 0;
      for (let y = 0; y < yEnd; y++) {
        for (let x = 0; x < c.width; x++) {
          const i = (y * c.width + x) * 4;
          const r = d[i], g = d[i+1], b = d[i+2];
          const max = Math.max(r,g,b), min = Math.min(r,g,b);
          const sat = max === 0 ? 0 : (max - min) / max;
          if (max > 238 && sat < 0.06) continue;   // 近白背景
          subject++;
          const key = (r >> 4) * 256 + (g >> 4) * 16 + (b >> 4);
          let bin = bins.get(key);
          if (!bin) { bin = { n: 0, r: 0, g: 0, b: 0 }; bins.set(key, bin); }
          bin.n++; bin.r += r; bin.g += g; bin.b += b;
        }
      }
      const top = [...bins.values()].sort((a, b) => b.n - a.n).slice(0, 3)
        .map(v => ({ n: v.n, rgb: [Math.round(v.r/v.n), Math.round(v.g/v.n), Math.round(v.b/v.n)] }));
      const dominant = top[0] ? top[0].rgb : [0,0,0];
      return JSON.stringify({
        w: c.width, h: c.height,
        subjectPct: +(subject/total*100).toFixed(1),
        avg: dominant,
        dominantShare: top[0] ? +(top[0].n/subject*100).toFixed(1) : 0,
        top3: top.map(t => 'rgb(' + t.rgb.join(',') + ')').join(' '),
      });
    })()`)
    const r = JSON.parse(out)
    measured.push({ file: f, name: basename(f), ...r })
    console.log(`  ${basename(f).slice(0, 40).padEnd(41)} ${String(r.w+'x'+r.h).padEnd(11)} 主体 ${String(r.subjectPct+'%').padEnd(7)} 主色 rgb(${r.avg.join(',')}) 占比${r.dominantShare}%  top3: ${r.top3}`)
  }

  /* -------------------------------------------- 最近邻匹配（唯一解校验） */
  console.log('\n槽位 → 文件 匹配结果：')
  const slots = plan.map((p) => ({ ...p, rgb: hexToRgb(p.color) }))
  const used = new Set()
  const assignment = []
  // 按「最优匹配的确定度」排序，先分配最有把握的槽位，避免被模糊匹配抢占
  const candidates = []
  for (const s of slots) {
    const ranked = measured
      .map((m) => ({ m, d: colorDist(s.rgb, m.avg) }))
      .sort((a, b) => a.d - b.d)
    candidates.push({ slot: s, best: ranked[0], second: ranked[1] })
  }
  candidates.sort((a, b) => a.best.d - b.best.d)

  let ambiguous = 0
  for (const c of candidates) {
    const pick = c.best
    const margin = c.second ? c.second.d - pick.d : Infinity
    if (used.has(pick.m.file)) {
      console.error(`  ✗ ${c.slot.slot} 的最佳匹配 ${pick.m.name} 已被占用`)
      ambiguous++
      continue
    }
    used.add(pick.m.file)
    assignment.push({ slot: c.slot, m: pick.m, dist: pick.d, margin })
    const flag = margin < 14 ? '  ⚠ 次优接近，请人工确认' : ''
    if (margin < 14) ambiguous++
    console.log(
      `  ${c.slot.slot.padEnd(5)} → ${pick.m.name.slice(0, 40).padEnd(41)} 期望 ${c.slot.color}  实测 rgb(${pick.m.avg.join(',')})  色距 ${pick.d.toFixed(1)}  余量 ${margin === Infinity ? "∞" : margin.toFixed(1)}${flag}`
    )
  }

  if (assignment.length !== plan.length) {
    console.error(`\n❌ 匹配不完整：${assignment.length}/${plan.length}`)
    process.exit(2)
  }
  if (ambiguous > 0) {
    console.error(`\n⚠️  有 ${ambiguous} 个槽位匹配余量偏小，未自动改名。请检查上面的输出后重跑或手工指定。`)
    process.exit(3)
  }

  /* ------------------------------------------------------------ 落盘 */
  const target = outDir || join(dir, 'renamed')
  mkdirSync(target, { recursive: true })
  for (const a of assignment) {
    const ext = extname(a.m.file).toLowerCase()
    renameSync(a.m.file, join(target, `${a.slot.slot}${ext}`))
  }
  console.log(`\n✅ ${assignment.length} 张图已按槽位重命名 → ${target}`)
} catch (e) {
  console.error('ERR', e.message)
  process.exit(1)
} finally {
  ws?.close()
  chrome.kill('SIGKILL')
}
