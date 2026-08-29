import React, { useState } from './react.js'
import { enabledStore, chibiStore, useEnabled } from './store.js'
import type { VisualEffect } from './types.js'

const EFFECT_STORAGE_KEY = 'dsh-reasoning-effort-slider.visual-effect'

const EFFECT_IDS: VisualEffect[] = ['radiation', 'particles', 'gradient', 'electric', 'flame', 'starfield', 'ripple']

const EFFECT_LABELS: Record<VisualEffect, string> = {
  radiation: '辐射光效',
  particles: '粒子系统',
  gradient: '渐变极光',
  electric: '电弧闪电',
  flame: '烈焰',
  starfield: '星河',
  ripple: '涟漪',
}

export function readEffect(): VisualEffect {
  try {
    const stored = localStorage.getItem(EFFECT_STORAGE_KEY) as VisualEffect | null
    if (stored !== null && EFFECT_IDS.includes(stored)) return stored
  } catch {}
  return 'radiation'
}

export function SettingsPanel() {
  const enabled = useEnabled()
  const [effect, setEffect] = useState<VisualEffect>(readEffect)
  const [chibi, setChibi] = useState(() => chibiStore.getSnapshot())

  const toggleEnabled = (value: boolean) => {
    enabledStore.set(value)
  }

  const selectEffect = (value: VisualEffect) => {
    setEffect(value)
    try {
      localStorage.setItem(EFFECT_STORAGE_KEY, value)
    } catch {}
  }

  const toggleChibi = (value: boolean) => {
    setChibi(value)
    chibiStore.set(value)
  }

  return React.createElement('div', { style: { padding: '12px' } },
    React.createElement('div', { style: { display: 'flex', gap: '16px', marginBottom: '12px' } },
      React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' } },
        React.createElement('input', {
          type: 'checkbox',
          checked: enabled,
          onChange: (e: any) => toggleEnabled(e.target.checked),
        }),
        ' 启用推理强度滑块'
      ),
      React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' } },
        React.createElement('input', {
          type: 'checkbox',
          checked: chibi,
          onChange: (e: any) => toggleChibi(e.target.checked),
        }),
        ' 显示跑步小人'
      )
    ),
    React.createElement('div', null,
      React.createElement('span', { className: 'dsh-res-effects-label' }, '视觉效果'),
      React.createElement('div', { className: 'dsh-res-effects' },
        EFFECT_IDS.map((id) =>
          React.createElement('button', {
            key: id,
            type: 'button',
            className: `dsh-res-effect-chip${effect === id ? ' is-active' : ''}`,
            onClick: () => selectEffect(id),
          }, EFFECT_LABELS[id]),
        )
      )
    )
  )
}