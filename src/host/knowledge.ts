import type { EffortLevel } from '../types.js'

/** Default 7-level configuration. */
export const DEFAULT_LEVELS: EffortLevel[] = [
  { id: 'off', name: '关闭' },
  { id: 'minimal', name: '极低' },
  { id: 'low', name: '低' },
  { id: 'medium', name: '中' },
  { id: 'high', name: '高' },
  { id: 'xhigh', name: '极高' },
  { id: 'max', name: '最大' },
]

/** Built-in model knowledge base. */
export const MODEL_KNOWLEDGE: Record<string, { provider: string; model: string; efforts: EffortLevel[]; compat?: Record<string, unknown> }> = {
  'glm-5.2': {
    provider: 'zai-coding-cn',
    model: 'glm-5.1',
    efforts: [
      { id: 'off', name: '关闭' },
      { id: 'minimal', name: '极低' },
      { id: 'low', name: '低' },
      { id: 'medium', name: '中' },
      { id: 'high', name: '高' },
      { id: 'xhigh', name: '极高' },
    ],
    compat: {
      thinkingFormat: 'zai',
      supportsReasoningEffort: true,
    },
  },
  'kimi-k3': {
    provider: 'zai-coding-cn',
    model: 'kimi-k2.5',
    efforts: [
      { id: 'low', name: '低' },
      { id: 'high', name: '高' },
      { id: 'max', name: '最大' },
    ],
    compat: {
      thinkingFormat: 'zai',
      supportsReasoningEffort: true,
    },
  },
}

/** Get effort levels for a model, falling back to defaults. */
export function getEffortLevels(
  provider: string,
  model: string,
  customLevels?: EffortLevel[],
): EffortLevel[] {
  if (customLevels && customLevels.length > 0) {
    return customLevels
  }

  // Check knowledge base
  for (const [key, info] of Object.entries(MODEL_KNOWLEDGE)) {
    if (info.provider === provider && info.model.includes(model)) {
      return info.efforts
    }
  }

  return DEFAULT_LEVELS
}

/** Check if a model has reasoning efforts declared. */
export function hasReasoningEfforts(provider: string, model: string): boolean {
  return getEffortLevels(provider, model).length >= 2
}
