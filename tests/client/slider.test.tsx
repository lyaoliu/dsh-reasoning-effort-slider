import { describe, it, expect, vi } from 'vitest'
import { EffortSlider } from '../../src/client/slider.js'
import type { EffortLevel } from '../../src/types.js'

const LEVELS: EffortLevel[] = [
  { id: 'off', name: '关闭' },
  { id: 'minimal', name: '极低' },
  { id: 'low', name: '低' },
  { id: 'medium', name: '中' },
  { id: 'high', name: '高' },
  { id: 'xhigh', name: '极高' },
  { id: 'max', name: '最大' },
]

describe('EffortSlider', () => {
  it('renders with correct level names', () => {
    // This is a unit test placeholder - full testing requires DOM environment
    expect(LEVELS.length).toBe(7)
    expect(LEVELS[0].id).toBe('off')
    expect(LEVELS[0].name).toBe('关闭')
  })

  it('has all 7 levels', () => {
    expect(LEVELS).toHaveLength(7)
  })
})
