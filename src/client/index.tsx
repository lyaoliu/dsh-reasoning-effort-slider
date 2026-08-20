import React from 'react'
import { type EffortLevel, type VisualEffect, type PluginConfig } from './types.js'

export interface ReasoningEffortSliderProps {
  levels: EffortLevel[]
  visualEffect: VisualEffect
  enabled: boolean
  onChange?: (level: EffortLevel) => void
}

export function ReasoningEffortSlider(_props: ReasoningEffortSliderProps): React.ReactElement {
  return React.createElement('div', { className: 'dsh-reasoning-effort-slider' }, 'Reasoning Effort Slider')
}

export function mount(_config: PluginConfig): () => void {
  return () => { /* cleanup */ }
}
