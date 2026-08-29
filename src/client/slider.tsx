import React, { useEffect, useRef } from './react.js'
import type { EffortLevel, VisualEffect } from './types.js'
import chibiSprite from './assets/chibi-runner-strip.png'

interface EffortSliderProps {
  readonly levels: readonly EffortLevel[]
  readonly currentId: string
  readonly onEffortChange: (id: string) => void
  readonly onDraggingChange?: (dragging: boolean) => void
  readonly visualEffect?: VisualEffect
  readonly chibi?: boolean
}

/** Continuous render state shared by every effect painter. */
interface FxState {
  readonly progress: number
  readonly dragging: boolean
}

interface Burst {
  readonly start: number
  readonly x: number
}

interface Dust {
  readonly born: number
  readonly x: number
  readonly y: number
  readonly vx: number
  readonly vy: number
}

const BURST_MS = 450
const DUST_MS = 500

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/**
 * Full radiation: triple wave + crest + pillar energy, inner vertical glow,
 * backward streak particles (count scales with intensity) and a radial glow
 * at the knob. Light/dark aware.
 */
function drawRadiation(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, s: FxState, isDark: boolean): void {
  const origin = s.progress * w
  if (origin <= 0) return
  const cell = 4
  const speed = s.dragging ? 2.8 : 1

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, origin, h)
  ctx.clip()

  for (let x = 0; x < origin; x += cell) {
    const delta = x + cell * 0.5 - origin
    const distance = Math.abs(delta)
    const phaseA = distance / 10 - time * 0.0074 * speed
    const phaseB = distance / 23 - time * 0.0041 * speed + 1.7
    const phaseC = distance / 40 - time * 0.0022 * speed + 3.4
    const sinA = Math.max(0, Math.sin(phaseA))
    const sinB = Math.max(0, Math.sin(phaseB))
    const sinC = Math.max(0, Math.sin(phaseC))
    const waveA = Math.pow(sinA, 2.6)
    const waveB = Math.pow(sinB, 3.2)
    const waveC = Math.pow(sinC, 4)
    const crest = Math.pow(sinA, 15) + Math.pow(sinB, 18) * 0.78
    const wave = Math.min(1, waveA * 0.76 + waveB * 0.58 + waveC * 0.32)
    const trail = 0.38 + 0.62 * Math.exp(-distance / Math.max(55, w * 0.72))
    const pillar = Math.pow(Math.max(0, Math.sin(x / 20 + time * 0.0016)), 3) * 0.27
    const columnEnergy = trail * (wave * 1.04 + pillar + crest * 0.32)

    if (columnEnergy > 0.012) {
      const nearness = Math.max(0, 1 - distance / Math.max(1, w * 0.78))
      const red = isDark ? Math.round(42 + 124 * nearness + 75 * wave) : Math.round(28 + 58 * nearness + 15 * wave)
      const green = isDark ? Math.round(56 + 58 * nearness + 44 * crest) : Math.round(88 + 72 * nearness + 30 * crest)
      const blue = isDark ? Math.round(175 + 72 * nearness + 8 * wave) : Math.round(182 + 62 * nearness)
      const alpha = isDark ? Math.min(0.88, columnEnergy * 0.72) : Math.min(0.62, columnEnergy * 0.54)
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`
      ctx.fillRect(x, 0, cell - 1, h)
    }

    for (let y = 0; y < h; y += cell) {
      const deltaY = y + cell * 0.5 - h * 0.5
      const radial = Math.hypot(delta / 38, deltaY / 11)
      const halo = Math.exp(-radial * 0.96) * 1.08
      const verticalShape = 0.58 + 0.42 * Math.cos((deltaY / h) * Math.PI)
      const grain = 0.72 + 0.28 * Math.sin(x * 0.73 + y * 1.31 + time * 0.006)
      const alpha = Math.min(0.96, (columnEnergy * 0.88 + halo + crest * 0.19) * verticalShape * grain)
      if (alpha < 0.035) continue

      const hot = Math.max(0, 1 - radial / 2.4)
      const red = isDark ? Math.round(54 + 148 * hot + 42 * wave + 35 * crest) : Math.round(25 + 72 * hot + 12 * wave)
      const green = isDark ? Math.round(68 + 78 * hot + 46 * crest) : Math.round(98 + 72 * hot + 24 * crest)
      const blue = isDark ? Math.round(186 + 64 * hot) : Math.round(194 + 56 * hot)
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${isDark ? alpha : alpha * 0.72})`
      ctx.fillRect(x, y, cell - 1, cell - 1)
    }
  }

  const streaks = Math.round(6 + 10 * s.progress)
  for (let i = 0; i < streaks; i += 1) {
    const travel = (time * (s.dragging ? 0.16 : 0.065) * (0.78 + (i % 5) * 0.09) + i * 23) % Math.max(30, origin + 64)
    const px = origin - travel
    if (px < -24 || px > w + 16) continue
    const py = 3 + ((i * 13 + Math.sin(time * 0.003 + i) * 5) % Math.max(7, h - 6))
    const length = 4 + (i % 4) * 4 + (s.dragging ? 6 : 0)
    const alpha = 0.28 + (i % 5) * 0.1
    const streak = ctx.createLinearGradient(px, 0, px + length, 0)
    streak.addColorStop(0, isDark ? 'rgba(72,118,255,0)' : 'rgba(24,94,184,0)')
    streak.addColorStop(0.68, isDark ? `rgba(112,135,255,${alpha})` : `rgba(36,108,202,${alpha * 0.72})`)
    streak.addColorStop(1, isDark ? `rgba(236,222,255,${Math.min(1, alpha + 0.26)})` : `rgba(103,175,248,${Math.min(0.82, alpha + 0.18)})`)
    ctx.fillStyle = streak
    ctx.fillRect(px, py, length, i % 3 === 0 ? 2 : 1)
  }

  const glow = ctx.createRadialGradient(origin, h / 2, 0, origin, h / 2, 24)
  glow.addColorStop(0, isDark ? 'rgba(255,255,255,.82)' : 'rgba(255,255,255,.86)')
  glow.addColorStop(0.14, isDark ? 'rgba(183,190,255,.54)' : 'rgba(162,210,255,.48)')
  glow.addColorStop(0.44, isDark ? 'rgba(103,74,255,.28)' : 'rgba(37,112,207,.22)')
  glow.addColorStop(1, isDark ? 'rgba(86,31,210,0)' : 'rgba(25,91,181,0)')
  ctx.fillStyle = glow
  ctx.fillRect(origin - 26, 0, 52, h)
  ctx.restore()
}

/** Floating particles; count / speed / brightness scale with intensity. */
function drawParticles(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, s: FxState, isDark: boolean): void {
  const count = Math.round(12 + 20 * s.progress)
  const speed = (s.dragging ? 2 : 0.8) * (0.7 + 0.6 * s.progress)
  const boost = 0.6 + 0.4 * s.progress
  for (let i = 0; i < count; i++) {
    const seed = i * 137.508
    const px = ((seed + time * 0.015 * speed) % (w + 30)) - 15
    const py = (Math.sin(seed * 0.1 + time * 0.0025) * 0.5 + 0.5) * h
    const r = 2 + Math.sin(seed * 0.07) * 1.2
    const alpha = (0.35 + Math.sin(seed * 0.13 + time * 0.004) * 0.2) * boost
    ctx.beginPath()
    ctx.arc(px, py, r, 0, Math.PI * 2)
    ctx.fillStyle = isDark
      ? `rgba(168, 130, 255, ${alpha})`
      : `rgba(99, 102, 241, ${alpha})`
    ctx.fill()
  }
}

/** Flowing aurora bands over the CSS base gradient; saturation scales with intensity. */
function drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, s: FxState, isDark: boolean): void {
  ctx.save()
  ctx.globalCompositeOperation = isDark ? 'screen' : 'overlay'
  for (let k = 0; k < 3; k++) {
    const hue = Math.round((time * 0.02 + k * 120) % 360)
    const cx = w * (0.5 + 0.45 * Math.sin(time * 0.00035 + k * 2.1))
    const half = Math.max(40, w * 0.35)
    const alpha = (isDark ? 0.2 : 0.16) * (0.5 + 0.5 * s.progress) + 0.05
    const band = ctx.createLinearGradient(cx - half, 0, cx + half, 0)
    band.addColorStop(0, `hsla(${hue}, 85%, 60%, 0)`)
    band.addColorStop(0.5, `hsla(${hue}, 85%, ${isDark ? 62 : 55}%, ${alpha})`)
    band.addColorStop(1, `hsla(${hue}, 85%, 60%, 0)`)
    ctx.fillStyle = band
    ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()
}

/** Deterministic pseudo-random in [0,1) from a numeric seed. */
function hash(n: number): number {
  const x = Math.sin(n) * 43758.5453
  return x - Math.floor(x)
}

/** Electric: jagged arcs from track start to the knob, forks and knob sparks; bolt count scales with intensity. */
function drawElectric(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, s: FxState, isDark: boolean): void {
  const origin = s.progress * w
  if (origin <= 0) return

  const base = ctx.createLinearGradient(0, 0, 0, h)
  base.addColorStop(0, 'rgba(0,0,0,0)')
  base.addColorStop(0.5, isDark ? `rgba(90,140,255,${0.10 + 0.15 * s.progress})` : `rgba(70,110,240,${0.08 + 0.12 * s.progress})`)
  base.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, origin, h)

  const bolts = 1 + Math.round(2 * s.progress)
  const jitterSeed = Math.floor(time / 90)
  const amp = h * 0.3
  for (let b = 0; b < bolts; b++) {
    const segments = 14
    ctx.beginPath()
    for (let i = 0; i <= segments; i++) {
      const x = (origin * i) / segments
      const edge = i === 0 || i === segments
      const y = h / 2 + (edge ? 0 : (hash(jitterSeed * 127.1 + i * 311.7 + b * 1013.3) * 2 - 1) * amp)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = isDark ? 'rgba(120,170,255,0.35)' : 'rgba(70,110,240,0.30)'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = isDark ? 'rgba(235,244,255,0.9)' : 'rgba(30,60,190,0.85)'
    ctx.lineWidth = 1.2
    ctx.stroke()

    for (let i = 2; i < segments - 1; i += 4) {
      if (hash(jitterSeed + i * 17.7 + b * 57.3) < 0.55) continue
      const x = (origin * i) / segments
      const y = h / 2 + (hash(jitterSeed * 127.1 + i * 311.7 + b * 1013.3) * 2 - 1) * amp
      const dir = hash(i + jitterSeed) > 0.5 ? 1 : -1
      const len = 6 + hash(i * 3.3 + jitterSeed) * 10
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + len * 0.4, y + dir * len * 0.5)
      ctx.lineTo(x + len, y + dir * len)
      ctx.strokeStyle = isDark ? 'rgba(170,200,255,0.5)' : 'rgba(60,90,220,0.45)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  const sparks = Math.round(4 + 8 * s.progress)
  for (let i = 0; i < sparks; i++) {
    const a = hash(jitterSeed * 3.1 + i * 91.7) * Math.PI * 2
    const r = 3 + hash(i * 7.7 + jitterSeed) * 9
    ctx.fillStyle = isDark ? 'rgba(220,235,255,0.8)' : 'rgba(40,70,200,0.7)'
    ctx.fillRect(origin + Math.cos(a) * r, h / 2 + Math.sin(a) * r * 0.7, 1.5, 1.5)
  }
}

/** Flame: rising fire particles; hue shifts blue (low) to orange-red (high); heat glow at the knob. */
function drawFlame(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, s: FxState, isDark: boolean): void {
  const origin = s.progress * w
  if (origin <= 0) return
  const hue = 210 - 190 * s.progress
  const count = Math.round(18 + 42 * s.progress)
  const boost = 0.6 + 0.4 * s.progress
  ctx.save()
  if (isDark) ctx.globalCompositeOperation = 'screen'
  for (let i = 0; i < count; i++) {
    const sx = hash(i * 12.9898) * origin
    const speed = 0.5 + hash(i * 78.233) * 1.1
    const t = (time * 0.0006 * speed * (s.dragging ? 1.8 : 1) + hash(i * 3.7)) % 1
    const x = sx + Math.sin(time * 0.004 + i) * 2.5
    const y = h - t * (h + 6)
    const r = (1 - t) * 2.6 + 0.6
    const alpha = (1 - t) * (isDark ? 0.55 : 0.5) * boost
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${hue + (hash(i * 91.7) * 30 - 15)}, 95%, ${isDark ? 60 : 52}%, ${alpha})`
    ctx.fill()
  }
  const glow = ctx.createRadialGradient(origin, h / 2, 0, origin, h / 2, 22)
  glow.addColorStop(0, `hsla(${hue + 20}, 95%, 70%, ${0.5 * boost})`)
  glow.addColorStop(1, `hsla(${hue}, 95%, 50%, 0)`)
  ctx.fillStyle = glow
  ctx.fillRect(origin - 22, 0, 44, h)
  ctx.restore()
}

/** Starfield: three parallax star layers; the knob is a comet head with a tail; dragging spawns meteors. */
function drawStarfield(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, s: FxState, isDark: boolean): void {
  const origin = s.progress * w
  const speedScale = (s.dragging ? 2 : 1) * (0.6 + 0.8 * s.progress)
  for (let layer = 0; layer < 3; layer++) {
    const speed = (12 + layer * 14) * speedScale
    const size = 0.7 + layer * 0.5
    const baseAlpha = isDark ? 0.35 + layer * 0.2 : 0.25 + layer * 0.15
    for (let i = 0; i < 14; i++) {
      const seed = i + layer * 100
      const x = w + 10 - ((time * 0.001 * speed + hash(seed * 91.7) * (w + 20)) % (w + 20))
      const y = hash(seed * 45.3) * h
      const tw = 0.7 + 0.3 * Math.sin(time * 0.003 + seed)
      ctx.fillStyle = isDark ? `rgba(210,225,255,${baseAlpha * tw})` : `rgba(70,90,160,${baseAlpha * tw})`
      ctx.fillRect(x, y, size, size)
    }
  }
  if (origin <= 0) return

  const tail = ctx.createLinearGradient(origin - 46, 0, origin, 0)
  tail.addColorStop(0, isDark ? 'rgba(140,170,255,0)' : 'rgba(70,110,220,0)')
  tail.addColorStop(1, isDark ? 'rgba(190,210,255,0.55)' : 'rgba(60,100,220,0.45)')
  ctx.fillStyle = tail
  ctx.fillRect(origin - 46, h / 2 - 2, 46, 4)
  const head = ctx.createRadialGradient(origin, h / 2, 0, origin, h / 2, 10)
  head.addColorStop(0, isDark ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.95)')
  head.addColorStop(1, isDark ? 'rgba(140,170,255,0)' : 'rgba(70,110,220,0)')
  ctx.fillStyle = head
  ctx.fillRect(origin - 10, h / 2 - 10, 20, 20)

  if (s.dragging) {
    for (let i = 0; i < 2; i++) {
      const mx = w + 30 - ((time * 0.35 + i * 173) % (w + 60))
      const my = 4 + hash(i * 7.7 + Math.floor(time / 300)) * (h - 8)
      const len = 14 + i * 6
      const grad = ctx.createLinearGradient(mx, my, mx + len, my - len * 0.25)
      grad.addColorStop(0, isDark ? 'rgba(230,240,255,0.8)' : 'rgba(50,90,200,0.7)')
      grad.addColorStop(1, isDark ? 'rgba(140,170,255,0)' : 'rgba(70,110,220,0)')
      ctx.strokeStyle = grad
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(mx, my)
      ctx.lineTo(mx + len, my - len * 0.25)
      ctx.stroke()
    }
  }
}

/** Ripple: layered sine waves flowing in the filled region + periodic ripple rings at the knob. */
function drawRipple(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, s: FxState, isDark: boolean): void {
  const origin = s.progress * w
  if (origin <= 0) return
  const ampScale = (0.6 + 0.8 * s.progress) * (s.dragging ? 1.6 : 1)

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, origin, h)
  ctx.clip()
  const water = ctx.createLinearGradient(0, 0, 0, h)
  water.addColorStop(0, isDark ? 'rgba(90,160,255,0.10)' : 'rgba(40,120,220,0.10)')
  water.addColorStop(1, isDark ? 'rgba(60,120,255,0.28)' : 'rgba(30,100,210,0.25)')
  ctx.fillStyle = water
  ctx.fillRect(0, 0, origin, h)
  for (let k = 0; k < 3; k++) {
    const amp = (1.6 + 0.8 * k) * ampScale
    const yBase = h * (0.3 + 0.22 * k)
    ctx.beginPath()
    for (let x = 0; x <= origin; x += 4) {
      const y = yBase + Math.sin(x * 0.055 - time * 0.004 * (1 + k * 0.35) + k * 2.1) * amp
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = isDark ? `rgba(150,200,255,${0.55 - k * 0.13})` : `rgba(30,110,220,${0.5 - k * 0.12})`
    ctx.lineWidth = 1.2
    ctx.stroke()
  }
  ctx.restore()

  const phase = (time % 1200) / 1200
  const r = 3 + phase * 16
  ctx.strokeStyle = isDark ? `rgba(150,200,255,${(1 - phase) * 0.5})` : `rgba(30,110,220,${(1 - phase) * 0.4})`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.ellipse(origin, h / 2, r, r * 0.45, 0, 0, Math.PI * 2)
  ctx.stroke()
}

/** One dot per selectable level. */
function drawTicks(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, isDark: boolean): void {
  if (count < 2) return
  ctx.fillStyle = isDark ? 'rgba(255,255,255,.30)' : 'rgba(30,50,90,.25)'
  for (let i = 0; i < count; i++) {
    const x = 4 + (w - 8) * (i / (count - 1))
    ctx.beginPath()
    ctx.arc(x, h / 2, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Expanding ring + radial sparks at the knob on commit; 450ms decay. */
function drawBursts(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, bursts: Burst[], isDark: boolean): void {
  for (let i = bursts.length - 1; i >= 0; i--) {
    const burst = bursts[i]
    const t = (time - burst.start) / BURST_MS
    if (t >= 1) {
      bursts.splice(i, 1)
      continue
    }
    const cx = burst.x * w
    const cy = h / 2
    const ease = 1 - Math.pow(1 - t, 2)
    const radius = 6 + ease * 20
    const alpha = (1 - t) * (isDark ? 0.55 : 0.45)
    ctx.strokeStyle = isDark ? `rgba(140,160,255,${alpha})` : `rgba(60,110,220,${alpha})`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()

    const spark = 5 + ease * 9
    ctx.fillStyle = isDark ? `rgba(200,210,255,${alpha})` : `rgba(40,90,200,${alpha})`
    for (let k = 0; k < 10; k++) {
      const ang = (k / 10) * Math.PI * 2 + (burst.start % 1)
      const sx = cx + Math.cos(ang) * (radius + 2)
      const sy = cy + Math.sin(ang) * (radius + 2) * 0.6
      ctx.fillRect(sx, sy, Math.cos(ang) * spark, 1.5)
    }
  }
}

/** Dust kicked up behind the chibi runner while dragging. */
function stepDust(ctx: CanvasRenderingContext2D, h: number, time: number, dust: Dust[], origin: number, dragging: boolean, isDark: boolean): void {
  if (dragging) {
    for (let i = 0; i < 2; i++) {
      dust.push({
        born: time,
        x: origin - 10 - Math.random() * 6,
        y: h * (0.55 + Math.random() * 0.3),
        vx: -(0.6 + Math.random() * 1.2),
        vy: -(0.2 + Math.random() * 0.5),
      })
    }
  }
  for (let i = dust.length - 1; i >= 0; i--) {
    const d = dust[i]
    const age = time - d.born
    if (age >= DUST_MS) {
      dust.splice(i, 1)
      continue
    }
    const t = age / 16.7
    const x = d.x + d.vx * t
    const y = d.y + d.vy * t + 0.03 * t * t
    const alpha = (1 - age / DUST_MS) * (isDark ? 0.5 : 0.4)
    const size = 1 + (age / DUST_MS) * 1.5
    ctx.fillStyle = isDark ? `rgba(190,200,255,${alpha})` : `rgba(120,130,160,${alpha})`
    ctx.fillRect(x, y, size, size)
  }
  if (dust.length > 120) dust.splice(0, dust.length - 120)
}

export function EffortSlider({ levels, currentId, onEffortChange, onDraggingChange, visualEffect = 'radiation', chibi = false }: EffortSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const progressRef = useRef(0)
  const draggingRef = useRef(false)
  const burstsRef = useRef<Burst[]>([])
  const dustRef = useRef<Dust[]>([])

  const idxOf = (id: string) => levels.findIndex((l) => l.id === id)
  const nameOf = (idx: number) => levels[idx]?.name ?? levels[idx]?.id ?? ''

  const KNOB_RADIUS = 14
  const CHIBI_KNOB_RADIUS = 20
  const setKnobLeft = (p: number) => {
    if (knobRef.current) {
      const r = chibi ? CHIBI_KNOB_RADIUS : KNOB_RADIUS
      knobRef.current.style.left = `clamp(${r}px, ${p * 100}%, calc(100% - ${r}px))`
    }
  }
  const setIntensity = (p: number) => {
    trackRef.current?.style.setProperty('--re-intensity', p.toFixed(3))
  }

  // 外部档位变化（切模型 / 目录 select 回写）时同步位置、标签与强度变量
  useEffect(() => {
    const idx = idxOf(currentId)
    const normalized = levels.length > 1 ? idx / (levels.length - 1) : 0
    progressRef.current = normalized
    setKnobLeft(normalized)
    setIntensity(normalized)
    if (labelRef.current) labelRef.current.textContent = nameOf(idx)
  }, [currentId, levels])

  // 动画循环：reduced-motion 时只画静态帧；dpr 上限 2
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = 1
    let height = 1
    let raf = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (time: number) => {
      const isDark = document.body.hasAttribute('data-ds-dark-theme')
      const state: FxState = { progress: progressRef.current, dragging: draggingRef.current }
      ctx.clearRect(0, 0, width, height)
      if (visualEffect === 'radiation') drawRadiation(ctx, width, height, time, state, isDark)
      else if (visualEffect === 'particles') drawParticles(ctx, width, height, time, state, isDark)
      else if (visualEffect === 'electric') drawElectric(ctx, width, height, time, state, isDark)
      else if (visualEffect === 'flame') drawFlame(ctx, width, height, time, state, isDark)
      else if (visualEffect === 'starfield') drawStarfield(ctx, width, height, time, state, isDark)
      else if (visualEffect === 'ripple') drawRipple(ctx, width, height, time, state, isDark)
      else drawAurora(ctx, width, height, time, state, isDark)
      drawTicks(ctx, width, height, levels.length, isDark)
      drawBursts(ctx, width, height, time, burstsRef.current, isDark)
      if (chibi) stepDust(ctx, height, time, dustRef.current, state.progress * width, state.dragging, isDark)
    }

    const loop = (time: number) => {
      draw(time)
      raf = window.requestAnimationFrame(loop)
    }
    const start = () => {
      if (raf === 0 && !media.matches) raf = window.requestAnimationFrame(loop)
    }
    const stop = () => {
      if (raf !== 0) window.cancelAnimationFrame(raf)
      raf = 0
    }
    const onResize = () => {
      resize()
      if (media.matches) draw(performance.now())
    }
    const onMedia = () => {
      if (media.matches) {
        stop()
        draw(performance.now())
      } else {
        resize()
        start()
      }
    }

    resize()
    if (media.matches) draw(performance.now())
    else start()
    window.addEventListener('resize', onResize)
    media.addEventListener('change', onMedia)
    return () => {
      stop()
      window.removeEventListener('resize', onResize)
      media.removeEventListener('change', onMedia)
    }
  }, [visualEffect, levels, chibi])

  const previewAt = (clientX: number) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return
    const p = clamp01((clientX - rect.left) / rect.width)
    const idx = Math.round(p * (levels.length - 1))
    progressRef.current = p
    setKnobLeft(p)
    setIntensity(p)
    if (labelRef.current) labelRef.current.textContent = nameOf(idx)
  }

  // 按下只预览不提交；松手时统一提交一次，并触发爆发反馈
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true
    onDraggingChange?.(true)
    e.currentTarget.classList.add('is-dragging')
    e.currentTarget.setPointerCapture(e.pointerId)
    previewAt(e.clientX)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    previewAt(e.clientX)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    onDraggingChange?.(false)
    e.currentTarget.classList.remove('is-dragging')
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const idx = Math.round(progressRef.current * (levels.length - 1))
    const selected = levels[idx]
    if (selected) {
      burstsRef.current.push({ start: performance.now(), x: progressRef.current })
      onEffortChange(selected.id)
    }
  }

  return (
    <div
      className={`dsh-res-slider${chibi ? ' is-chibi' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="dsh-res-slider-header">
        <span className="dsh-res-slider-title">推理强度</span>
        <span ref={labelRef} className="dsh-res-slider-value" />
      </div>
      <div ref={trackRef} className="dsh-res-slider-track" data-effect={visualEffect}>
        <canvas ref={canvasRef} className="dsh-res-slider-canvas" />
        {chibi ? (
          <div ref={knobRef} className="dsh-res-slider-knob chibi-knob" style={{ backgroundImage: `url("${chibiSprite}")` }} />
        ) : (
          <div ref={knobRef} className="dsh-res-slider-knob" />
        )}
      </div>
    </div>
  )
}
