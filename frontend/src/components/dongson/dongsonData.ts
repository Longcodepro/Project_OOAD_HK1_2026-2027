/**
 * Vector data & layers extracted directly from "Hoa văn Đông Sơn.html"
 * Exact archaeological composition of the Ngoc Lu bronze drum.
 */

export const T = Math.PI * 2
export const n2 = (v: number) => +v.toFixed(2)
export const P = (r: number, a: number) => n2(r * Math.cos(a)) + ',' + n2(r * Math.sin(a))

let uid = 0
export const getUid = () => ++uid

export const W = 'fill="#fff"'
export const S = (w: number) => `fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`
export const K = (w: number) => `fill="none" stroke="#000" stroke-width="${w}" stroke-linecap="round"`
export const KF = 'fill="#000"'

export interface MotifFigure {
  w: number
  h: number
  parts: Record<string, string>
}

// Chim Lạc bay, hướng phải, khung 200 x 84. Ba phần tách riêng để vỗ cánh.
export const CRANE: MotifFigure = {
  w: 200,
  h: 84,
  parts: {
    body: `
      <path ${W} d="M62,31 L6,20 L2,46 L62,49 Z"/>
      <path ${W} d="M56,31 Q84,24 108,30 Q126,35 140,28 Q146,23.5 153,23 L153,31.5 Q146,31.5 142,35 Q126,44.5 106,46.5 Q80,50 56,49 Z"/>
      <circle ${W} cx="155" cy="27" r="6.6"/>
      <path ${W} d="M159,22.2 L200,33.5 L158.5,31.8 Z"/>
      <path ${W} d="M153,22 Q141,9 119,7 Q134,15.5 146,26 Z"/>
      <path ${S(2.4)} d="M64,49 Q40,56 15,58 l-7,3.5 M72,49.5 Q48,61 22,64.5 l-7,3"/>
      <path ${K(1.5)} d="M57,36 L7,27 M57,40.5 L5,33.5 M57,45 L4,40"/>
      <path ${K(1.5)} d="M68,40.5 Q102,39 139,31.5"/>
      <circle ${K(1.3)} cx="155" cy="27" r="3.3"/><circle ${W} cx="155" cy="27" r="1.1"/>`,
    'wing-u': `
      <path ${W} d="M77,30.5 L66,5.5 Q78,.6 93,4 L102,29.5 Z"/>
      <path ${K(1.5)} d="M70.5,10.4 L95,9 M72.5,15.2 L96.8,13.8 M74.6,20 L98.6,18.8 M76.6,25 L100.4,24 M82.5,6 L89,29"/>`,
    'wing-d': `
      <path ${W} d="M77,48.5 L67,79 Q80,83.6 94,80 L102,49 Z"/>
      <path ${K(1.5)} d="M76,54.5 L100.4,54.5 M74,60.5 L98.8,60.5 M72,66.5 L97.2,66.8 M70,72.5 L95.6,73 M89,50 L82.5,79"/>`
  }
}

export const one = (w: number, h: number, s: string): MotifFigure => ({ w, h, parts: { all: s } })

// Chim đậu, khung 36 x 26
export const PERCH = one(36, 26, `
  <path ${W} d="M5,11 Q11,3 21,4 Q27,5 29,8.6 L36,10.4 L29,12.2 Q27,17 19,18 Q10,18 5,11 Z"/>
  <path ${W} d="M7,11 L0,5.5 L1,14.5 Z"/>
  <path ${S(1.5)} d="M15,18 L14,25 L17.6,25 M21,17.6 L21,25 L24.6,25"/>
  <circle ${KF} cx="26.6" cy="8.4" r=".95"/>
  <path ${K(1)} d="M10.5,10.2 Q16,6.8 22.5,8.8 M10.5,13.4 Q16,11 22.5,12.6"/>`)

// Hươu, khung 46 x 36
export const DEER = one(46, 36, `
  <path ${W} d="M8,18 Q20,14 31,16 L35,11 L37,7 L44.5,10 L43.4,13 L39,13.6 L37,20 Q36,26 32,26 L10,26 Q6,24 8,18 Z"/>
  <path ${W} d="M8.4,18 L3,15 L5.4,20.5 Z"/>
  <path ${S(2.2)} d="M11,25 L9,31 L10,35 M15.5,25 L17.2,31 L15.4,35 M29,25 L28,31 L30,35 M34,24 L36,30 L35,35"/>
  <path ${S(1.5)} d="M37,7 Q34,2.2 28,1 M34,3.6 L33,.6 M37.6,7 Q40.5,2.4 45,1 M40.6,3.4 L39.4,.6"/>
  <path ${K(1.05)} d="M11,19.6 Q21,16.6 31,18.6 M10,22.8 Q21,20.2 33,21.8"/>
  <circle ${KF} cx="40" cy="10" r=".9"/>`)

// Chim mỏ lớn
export const HORNBILL = one(40, 32, `
  <path ${W} d="M10,18 Q16,10 26,12 Q32,13 33,17 Q30,24 20,25 Q12,25 10,18 Z"/>
  <circle ${W} cx="32.6" cy="11.4" r="4"/>
  <path ${W} d="M35.4,8 Q44,9 39.6,18 Q39,12.6 34.6,13.6 Z"/>
  <path ${W} d="M15,14 L8,0 L22.5,2 L25,12.4 Z"/>
  <circle ${S(2.4)} cx="7" cy="22" r="4.8"/>
  <path ${S(1.5)} d="M18,25 L17,31.4 M24,24.4 L25,31.4"/>
  <path ${K(1)} d="M12.4,3.4 L18.6,12.4 M17,3 L22,12 M14,19 Q21,16 29,17.6"/>
  <circle ${KF} cx="33.4" cy="10.8" r=".9"/>`)

// Người múa / cầm giáo
export const dancer = (spear: boolean) => one(30, 48, `
  <path ${W} d="M14.5,10 Q8,2 1,0 Q6.4,5.4 10.4,12.4 Z"/>
  <path ${W} d="M17,8.6 Q16,2.4 11.6,0 Q12.4,5 13.4,10 Z"/>
  <path ${W} d="M12,12 Q5.4,8.6 0,8.8 Q5.4,11.4 10,14 Z"/>
  <circle ${W} cx="17.4" cy="12" r="3.4"/>
  <path ${W} d="M14,15.4 L21,15.4 L20.2,27 L14.8,27 Z"/>
  <path ${W} d="M13,26 L21,26 L28,40.4 L4,40.4 Z"/>
  <path ${S(2)} d="${spear ? 'M20,17.4 L26.6,22 M15,17.4 L8.4,21.4 L7,26.4' : 'M20,17.4 L27,20 L28.6,14.4 M15,17.4 L8,21 L5.6,26'}"/>
  ${spear ? `<path ${S(1.4)} d="M26.8,5 L26.8,46"/><path ${W} d="M26.8,0 L28.6,6 L25,6 Z"/>` : ''}
  <path ${S(2.2)} d="M12.6,40 L12,47 L16,47 M20.4,40 L21,47 L25,47"/>
  <path ${K(1)} d="M15,28.4 L9,39.4 M17,28.4 L15,39.4 M19,28.4 L21,39.4 M20.4,28.4 L25.4,39.4"/>
  <circle ${KF} cx="18.6" cy="11.6" r=".8"/>`)

// Nhà mái cong
export const HOUSE = (() => {
  let t = ''
  for (let x = 11; x <= 65; x += 4.5) t += `M${x},21.4 L${n2(x + 1.6)},27.4 `
  return one(76, 50, `
    <path ${W} d="M0,5 Q10,20 38,20 Q66,20 76,5 L74.4,16 Q64,28.6 38,28.6 Q12,28.6 1.6,16 Z"/>
    <path ${W} d="M31,15.6 Q37,10 44,13.6 L48.6,12.6 L44.6,16 Q38,19 31,15.6 Z"/>
    <path ${S(2)} d="M10,27 L8,48 M66,27 L68,48"/>
    <path ${S(2.4)} d="M5,39 L71,39"/>
    <path ${S(1.8)} d="M20,39 L20,48.4 M38,39 L38,48.4 M56,39 L56,48.4"/>
    <circle ${W} cx="28" cy="31.4" r="2.2"/><path ${W} d="M26,33.6 L30,33.6 L31,38 L25,38 Z"/>
    <circle ${W} cx="48" cy="31.4" r="2.2"/><path ${W} d="M46,33.6 L50,33.6 L51,38 L45,38 Z"/>
    <path ${K(1)} d="${t}"/>
    <circle ${KF} cx="5" cy="11.6" r="1"/><circle ${KF} cx="71" cy="11.6" r="1"/>`)
})()

// Nhà cầu mùa mái vòm
export const DOME = (() => {
  let d = ''
  for (let y = 18; y <= 40; y += 5.5) {
    for (let x = 6; x <= 46; x += 5) {
      if (x > 21 && x < 31) continue
      d += `<circle ${KF} cx="${x + (y % 2 ? 1.4 : 0)}" cy="${y}" r=".8"/>`
    }
  }
  return one(52, 46, `
    <path ${W} d="M2,44 Q2,14 16,12 Q24,12 24,22 L24,44 Z"/>
    <path ${W} d="M50,44 Q50,14 36,12 Q28,12 28,22 L28,44 Z"/>
    <path ${S(1.6)} d="M21,13.6 L31,13.6"/>
    <circle ${W} cx="15" cy="6.6" r="4.6"/><circle ${W} cx="37" cy="6.6" r="4.6"/>
    <circle ${K(1.2)} cx="15" cy="6.6" r="2"/><circle ${K(1.2)} cx="37" cy="6.6" r="2"/>
    <circle ${W} cx="26" cy="30" r="1.5"/><path ${S(1.3)} d="M26,32 L26,43"/>
    <path ${S(2)} d="M0,45 L52,45"/>${d}`)
})()

// Dàn trống
export const PLATFORM = (() => {
  let s = ''
  for (const x of [13, 25.6, 38.4, 51]) {
    s += `
      <path ${W} d="M${x - 4.4},46.6 L${x + 4.4},46.6 L${x + 3},34 L${x - 3},34 Z"/>
      <path ${K(.9)} d="M${x - 3.6},40 L${x + 3.6},40"/>
      <circle ${W} cx="${x}" cy="10" r="2.6"/>
      <path ${W} d="M${x - 3},13 L${x + 3},13 L${x + 3.4},21 L${x - 3.4},21 Z"/>
      <path ${S(1.3)} d="M${x},7.6 Q${x - 4},3 ${x - 7.4},3.4"/>
      <path ${S(1.2)} d="M${x + 1.6},15 L${x},33"/>`
  }
  return one(64, 48, s + `<path ${S(2.2)} d="M2,22 L62,22"/><path ${S(1.8)} d="M5,22 L5,47 M59,22 L59,47"/>`)
})()

// Đôi giã gạo
export const POUND = one(40, 48, `
  <path ${W} d="M14.4,48 L25.6,48 L27.4,38 L12.6,38 Z"/>
  <circle ${W} cx="9" cy="14" r="3"/><path ${W} d="M6.6,17 L12,17 L12.4,30 L6,30 Z"/><path ${W} d="M5,29.4 L13.4,29.4 L15.4,40.4 L3,40.4 Z"/>
  <circle ${W} cx="31" cy="14" r="3"/><path ${W} d="M28,17 L33.4,17 L34,30 L27.6,30 Z"/><path ${W} d="M26.6,29.4 L35,29.4 L37,40.4 L24.6,40.4 Z"/>
  <path ${S(1.8)} d="M11,19.4 L18.4,16 M29,19.4 L21.8,16 M6,40 L6,47 M12,40 L12,47 M28,40 L28,47 M34,40 L34,47"/>
  <path ${S(1.4)} d="M6.4,12 Q2.4,11 0,13.4 M33.6,12 Q37.6,11 40,13.4"/>
  <path ${S(1.8)} d="M17.4,4 L19.6,38 M22.6,2 L20.6,38"/>
  <path ${S(1.3)} d="M17.4,4 L13.6,.8 M22.6,2 L26.6,0"/>
  <path ${K(.9)} d="M7,32 L5.6,39.4 M10.4,32 L11.6,39.4 M29,32 L27.6,39.4 M32.4,32 L33.6,39.4"/>`)

export const allParts = (f: MotifFigure) => Object.values(f.parts).join('')

export const circ = (x: number, y: number, r: number) =>
  `M${n2(x + r)},${n2(y)}a${r},${r} 0 1 0 ${-2 * r},0a${r},${r} 0 1 0 ${2 * r},0`

export const line = (r: number, w = 1.3) =>
  `<circle r="${r}" fill="none" stroke="currentColor" stroke-width="${w}"/>`

export function dots(r: number, n: number, s: number) {
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = (i * T) / n
    d += circ(r * Math.cos(a), r * Math.sin(a), s)
  }
  return `<path d="${d}" fill="currentColor"/>`
}

export function tangent(R: number, rc: number, n: number, w = 1) {
  let c = '', k = '', l = ''
  for (let i = 0; i < n; i++) {
    const a = (i * T) / n, b = ((i + 1) * T) / n
    const x = R * Math.cos(a), y = R * Math.sin(a)
    c += circ(x, y, rc)
    k += circ(x, y, rc * 0.34)
    l += `M${P(R + rc, a)}L${P(R - rc, b)}`
  }
  return `<path d="${c}${l}" fill="none" stroke="currentColor" stroke-width="${w}"/><path d="${k}" fill="currentColor"/>`
}

export function saw(rBase: number, rTip: number, n: number) {
  let d = ''
  const h = T / n / 2
  for (let i = 0; i < n; i++) {
    const a = (i * T) / n
    d += `M${P(rBase, a - h * 0.92)}L${P(rTip, a)}L${P(rBase, a + h * 0.92)}Z`
  }
  return `<path d="${d}" fill="currentColor"/>`
}

export function crenel(r1: number, r2: number, n: number, w = 1.2) {
  let d = ''
  const q = T / n / 2
  for (let i = 0; i < n; i++) {
    const a = (i * T) / n
    d += (i ? 'L' : 'M') + P(r1, a) + 'L' + P(r1, a + q) + 'L' + P(r2, a + q) + 'L' + P(r2, a + 2 * q)
  }
  return `<path d="${d}Z" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linejoin="miter"/>`
}

export function starLayer() {
  const R = 110, r = 50, N = 14
  let d = '', h = ''
  for (let i = 0; i < N; i++) {
    const a = (i * T) / N - Math.PI / 2
    d += (i ? 'L' : 'M') + P(R, a) + 'L' + P(r, a + T / N / 2)
  }
  h += `<path class="sun" d="${d}Z" fill="currentColor"/><path d="${d}Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="miter"/>`
  let tri = '', dot = '', hatch = '', eye = ''
  for (let i = 0; i < N; i++) {
    const a = (i * T) / N - Math.PI / 2, b = a + T / N, m = a + T / N / 2
    const A = [R * Math.cos(a), R * Math.sin(a)]
    const B = [R * Math.cos(b), R * Math.sin(b)]
    const V = [r * Math.cos(m), r * Math.sin(m)]
    const G = [(A[0] + B[0] + V[0]) / 3, (A[1] + B[1] + V[1]) / 3]
    const ins = (p: number[], k: number) => [G[0] + (p[0] - G[0]) * k, G[1] + (p[1] - G[1]) * k]
    const lerp = (p: number[], q: number[], t: number) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
    const s = (p: number[]) => n2(p[0]) + ',' + n2(p[1])
    for (const k of [0.8, 0.56]) tri += `M${s(ins(A, k))}L${s(ins(V, k))}L${s(ins(B, k))}Z`
    const a9 = ins(A, 0.9), b9 = ins(B, 0.9), v9 = ins(V, 0.9)
    for (let j = 0; j <= 7; j++) {
      dot += circ(...(lerp(a9, v9, j / 7) as [number, number]), 0.95)
      if (j < 7) dot += circ(...(lerp(b9, v9, j / 7) as [number, number]), 0.95)
    }
    for (let j = 1; j < 5; j++) dot += circ(...(lerp(a9, b9, j / 5) as [number, number]), 0.95)
    const a8 = ins(A, 0.8), b8 = ins(B, 0.8), a5 = ins(A, 0.56), b5 = ins(B, 0.56)
    for (let j = 1; j <= 8; j++) {
      const t = j / 9
      hatch += `M${s(lerp(a8, b8, 0.1 + t * 0.8))}L${s(lerp(a5, b5, t))}`
    }
    const deg = n2((m * 180) / Math.PI)
    eye += `<g transform="rotate(${deg}) translate(91,0)"><path d="M-6,-1 A6.2,6.2 0 0 1 6,-1 Z M-6,1 A6.2,6.2 0 0 0 6,1 Z" fill="currentColor"/><path d="M-9,0 L-18,0 M-10,-2.6 L-15,-1 M-10,2.6 L-15,1" fill="none" stroke="currentColor" stroke-width="1"/></g>`
  }
  h += `<path d="${tri}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="miter"/><path d="${dot}" fill="currentColor"/><path d="${hatch}" fill="none" stroke="currentColor" stroke-width=".9"/>${eye}`
  return h + line(113.5, 1.4) + line(116.5, 1.4)
}

export function geoLayer() {
  return (
    dots(121, 96, 1.25) +
    line(125.5) +
    tangent(132, 4.9, 64) +
    line(138.6) +
    crenel(141.4, 149.6, 84) +
    line(152.6) +
    tangent(158, 3.5, 104, 0.9) +
    line(163.4) +
    line(166, 1.6) +
    line(223, 1.6) +
    line(225.6) +
    tangent(230.6, 3.4, 148, 0.9) +
    line(235.6) +
    line(275) +
    line(277.4) +
    tangent(282, 3, 196, 0.85) +
    line(286.6) +
    line(333) +
    dots(336.6, 220, 1.15) +
    line(340.2) +
    saw(341.4, 352.4, 150) +
    line(353.8) +
    tangent(359.6, 4.2, 186, 0.95) +
    line(365.4) +
    tangent(371.4, 4.2, 192, 0.95) +
    line(377.4) +
    saw(390.4, 379, 170) +
    line(391.6) +
    line(394.6) +
    line(398, 3)
  )
}

export const put = (f: MotifFigure, deg: number, r: number, s = 1, anchor = 'mid') =>
  `<g transform="rotate(${n2(deg)}) translate(0,${r}) scale(${s}) translate(${-f.w / 2},${
    anchor === 'foot' ? -f.h : -f.h / 2
  })">${allParts(f)}</g>`

export function masked(inner: string) {
  const id = 'm' + getUid()
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="-400" y="-400" width="800" height="800">${inner}</mask><rect x="-400" y="-400" width="800" height="800" fill="currentColor" mask="url(#${id})"/>`
}

export function row(items: [MotifFigure, number][], r: number, span: number, start: number) {
  const tot = items.reduce((s, [f, k]) => s + f.w * k, 0)
  const arc = (span * Math.PI / 180) * r
  const gap = (arc - tot) / items.length
  let s = gap / 2
  let h = ''
  for (const [f, k] of items) {
    const c = s + (f.w * k) / 2
    h += put(f, start - (c / r) * (180 / Math.PI), r, k, 'foot')
    s += f.w * k + gap
  }
  return h
}

export function peopleLayer() {
  const A = dancer(false), B = dancer(true)
  const half: [MotifFigure, number][] = [
    [HOUSE, 1], [A, 1], [B, 1], [A, 1], [B, 1], [A, 1], [B, 1],
    [POUND, 1], [DOME, 1], [A, 1], [B, 1], [A, 1], [PLATFORM, 1]
  ]
  return masked(row(half, 218, 180, 0) + row(half, 218, 180, 180))
}

export function deerLayer() {
  const d: [MotifFigure, number] = [DEER, 0.9]
  const b: [MotifFigure, number] = [HORNBILL, 1]
  const g = (f: [MotifFigure, number], n: number) => Array(n).fill(f)
  return masked(row([...g(d, 10), ...g(b, 6), ...g(d, 10), ...g(b, 8)], 271, 360, 62))
}

export function birdLayer() {
  let h = ''
  for (let i = 0; i < 18; i++) {
    const a = i * 20
    h += put(CRANE, a, 308, 0.47) + put(PERCH, a - 10.6, 320.6, 0.82)
  }
  return masked(h)
}

// Nón lá SVG
const HL = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" pathLength="1"'
export function hatSvg(full: boolean) {
  const ax = 120, ay = 14, by = 132, rx = 108, ry = 22
  let i = 0, s = ''
  const add = (d: string, w: number, cls = '') => {
    s += `<path ${HL} ${cls ? `class="${cls}"` : ''} style="--i:${i++}" stroke-width="${w}" d="${d}"/>`
  }
  if (!full) {
    add(`M${ax},${ay} L${ax - rx},${by} A${rx},${ry} 0 0 0 ${ax + rx},${by} Z`, 9)
    for (const t of [0.42, 0.72]) {
      add(`M${ax - rx * t},${ay + (by - ay) * t} A${rx * t},${ry * t} 0 0 0 ${ax + rx * t},${ay + (by - ay) * t}`, 5.5)
    }
    return s
  }
  add(`M${ax - rx},${by} L${ax},${ay} L${ax + rx},${by}`, 2.6)
  add(`M${ax - rx},${by} A${rx},${ry} 0 0 0 ${ax + rx},${by}`, 2.6)
  add(`M${ax - rx + 3},${by + 4} A${rx - 3},${ry} 0 0 0 ${ax + rx - 3},${by + 4}`, 1.3)
  for (const t of [0.1, 0.19, 0.28, 0.37, 0.46, 0.55, 0.64, 0.73, 0.82, 0.91]) {
    const y = ay + (by - ay) * t
    add(`M${n2(ax - rx * t)},${n2(y)} A${n2(rx * t)},${n2(ry * t)} 0 0 0 ${n2(ax + rx * t)},${n2(y)}`, t > 0.8 ? 1.3 : 1)
  }
  for (let k = 1; k < 18; k++) {
    const p = (Math.PI * k) / 18
    add(`M${ax},${ay} L${n2(ax + rx * Math.cos(p))},${n2(by + ry * Math.sin(p))}`, 0.55)
  }
  s += `<g class="strap">`
  add(`M62,150.4 Q70,196 120,200 Q170,196 178,150.4`, 2.2)
  add(`M68,151.6 Q76,190 120,193.6 Q164,190 172,151.6`, 1)
  s += `</g><circle cx="${ax}" cy="${ay}" r="2.6" fill="currentColor"/>`
  return s
}

// Render motif figure into SVG HTML
export function renderFigureSvg(f: MotifFigure): string {
  let h = ''
  for (const [k, v] of Object.entries(f.parts)) {
    const id = 'm' + getUid()
    h += `<mask id="${id}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="${f.w + 20}" height="${f.h + 20}">${v}</mask>
          <g class="${k}"><rect x="-10" y="-10" width="${f.w + 20}" height="${f.h + 20}" fill="currentColor" mask="url(#${id})"/></g>`
  }
  return h
}
