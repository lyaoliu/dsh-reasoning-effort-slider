import React, { useState } from 'react'
import type { VisualEffect } from '../types.js'

const ENABLED_STORAGE_KEY = 'dsh-reasoning-effort-slider.enabled'
const EFFECT_STORAGE_KEY = 'dsh-reasoning-effort-slider.visual-effect'

function readEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

function readEffect(): VisualEffect {
  try {
    const stored = localStorage.getItem(EFFECT_STORAGE_KEY)
    if (stored === 'particles' || stored === 'gradient') return stored
  } catch {}
  return 'radiation'
}

export function SettingsPanel() {
  const [enabled, setEnabled] = useState(readEnabled)
  const [effect, setEffect] = useState<VisualEffect>(readEffect)

  const toggleEnabled = (value: boolean) => {
    setEnabled(value)
    try {
      localStorage.setItem(ENABLED_STORAGE_KEY, String(value))
    } catch {}
  }

  const selectEffect = (value: VisualEffect) => {
    setEffect(value)
    try {
      localStorage.setItem(EFFECT_STORAGE_KEY, value)
    } catch {}
  }

  return React.createElement('div', { style: { padding: '12px' } },
    React.createElement('div', { style: { marginBottom: '12px' } },
      React.createElement('label', null,
        React.createElement('input', {
          type: 'checkbox',
          checked: enabled,
          onChange: (e: any) => toggleEnabled(e.target.checked),
        }),
        ' 启用推理强度滑块'
      )
    ),
    React.createElement('div', null,
      React.createElement('span', null, '视觉效果: '),
      React.createElement('select', {
        value: effect,
        onChange: (e: any) => selectEffect(e.target.value as VisualEffect),
      },
        React.createElement('option', { value: 'radiation' }, '辐射光效'),
        React.createElement('option', { value: 'particles' }, '粒子系统'),
        React.createElement('option', { value: 'gradient' }, '渐变填充')
      )
    )
  )
}
