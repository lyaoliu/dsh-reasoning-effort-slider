import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CSS } from './styles.js'
import type { EffortLevel } from '../types.js'

interface EffortSliderProps {
  readonly levels: EffortLevel[]
  readonly currentId: string
  readonly onEffortChange: (id: string) => void
  readonly visualEffect?: 'radiation' | 'particles' | 'gradient'
}

export function EffortSlider({ levels, currentId, onEffortChange, visualEffect = 'radiation' }: EffortSliderProps) {
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    const idx = levels.findIndex((l) => l.id === currentId)
    const normalized = levels.length > 1 ? idx / (levels.length - 1) : 0
    setProgress(normalized)
  }, [currentId, levels])

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()

    const animate = (time: number) => {
      if (!ctx || !canvas) return
      const width = canvas.width / window.devicePixelRatio
      const height = canvas.height / window.devicePixelRatio
      const origin = progress * width

      ctx.clearRect(0, 0, width, height)

      if (visualEffect === 'radiation' && origin > 0) {
        // Draw radiation effect
        const isDark = document.body.hasAttribute('data-ds-dark-theme')
        const cell = 4
        const speed = dragging ? 2.8 : 1

        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, origin, height)
        ctx.clip()

        for (let x = 0; x < origin; x += cell) {
          const delta = x + cell * 0.5 - origin
          const distance = Math.abs(delta)
          const phaseA = distance / 10 - time * 0.0074 * speed
          const sinA = Math.max(0, Math.sin(phaseA))
          const wave = Math.pow(sinA, 2.6)
          const trail = 0.38 + 0.62 * Math.exp(-distance / Math.max(55, width * 0.72))
          const columnEnergy = trail * wave

          if (columnEnergy > 0.012) {
            const nearness = Math.max(0, 1 - distance / Math.max(1, width * 0.78))
            const red = isDark ? Math.round(42 + 124 * nearness) : Math.round(28 + 58 * nearness)
            const green = isDark ? Math.round(56 + 58 * nearness) : Math.round(88 + 72 * nearness)
            const blue = isDark ? Math.round(175 + 72 * nearness) : Math.round(182 + 62 * nearness)
            const alpha = isDark ? Math.min(0.88, columnEnergy * 0.72) : Math.min(0.62, columnEnergy * 0.54)
            ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`
            ctx.fillRect(x, 0, cell - 1, height)
          }
        }
        ctx.restore()
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [progress, dragging, visualEffect])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newProgress = Math.max(0, Math.min(1, x / rect.width))
    setProgress(newProgress)
  }, [dragging])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)

    const idx = Math.round(progress * (levels.length - 1))
    const selected = levels[idx]
    if (selected) {
      onEffortChange(selected.id)
    }
  }, [dragging, progress, levels, onEffortChange])

  return React.createElement('div', {
    className: 'dsh-res-slider',
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  },
    React.createElement('div', { className: 'dsh-res-slider-track' },
      React.createElement('canvas', { ref: canvasRef, className: 'dsh-res-slider-canvas' }),
      React.createElement('div', {
        className: 'dsh-res-slider-knob',
        style: { left: `${progress * 100 - 10}px` }
      })
    ),
    React.createElement('span', { className: 'dsh-res-slider-label' },
      levels.find((l) => l.id === currentId)?.name ?? currentId
    )
  )
}
