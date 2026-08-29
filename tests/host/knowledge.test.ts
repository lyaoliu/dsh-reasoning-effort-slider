import { describe, it, expect } from 'vitest'
import { getEffortLevels, DEFAULT_LEVELS } from '../../src/host/knowledge.js'

describe('getEffortLevels', () => {
  it('returns default levels when no match', () => {
    const levels = getEffortLevels('unknown-provider', 'unknown-model')
    expect(levels).toEqual(DEFAULT_LEVELS)
  })

  it('returns custom levels when provided', () => {
    const custom = [{ id: 'low', name: '低' }]
    const levels = getEffortLevels('any', 'any', custom)
    expect(levels).toEqual(custom)
  })

  it('matches known model', () => {
    const levels = getEffortLevels('zai-coding-cn', 'glm-5.1')
    expect(levels.length).toBeGreaterThan(0)
  })
})
