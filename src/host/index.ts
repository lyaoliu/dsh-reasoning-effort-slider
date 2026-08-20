import type { Plugin } from '@deepseek-ai/cordis'
import { getEffortLevels, hasReasoningEfforts } from './knowledge.js'
import type { AdaptGuidance, PluginConfig } from '../types.js'

const PLUGIN_ID = 'reasoning-effort-slider'
const RPC_CHANNEL = '/dsh-reasoning-effort-slider'

/** Read plugin config from settings. */
function readPluginConfig(settings: any): PluginConfig {
  const ns = settings.get('dsh-reasoning-effort') as PluginConfig | undefined
  return {
    enabled: true,
    visualEffect: 'radiation',
    ...ns,
  }
}

export const plugin: Plugin = {
  id: PLUGIN_ID,
  name: 'dsh-reasoning-effort-slider',
  apply(ctx: any) {
    const settings = ctx.get('settings')
    if (!settings) return

    const config = readPluginConfig(settings)

    // Register RPC endpoints
    const harness = ctx.get('harness')
    if (!harness) return

    harness.handle(RPC_CHANNEL, 'diagnose', async (args: { provider: string; model: string }) => {
      const { provider, model } = args
      const levels = getEffortLevels(provider, model, config.levels)
      const hasEfforts = hasReasoningEfforts(provider, model)

      return {
        ok: true,
        value: {
          provider,
          model,
          userDeclared: false,
          needsGuide: !hasEfforts,
          reason: hasEfforts ? 'none' : 'missing',
          current: [],
          expected: levels.map((l) => l.id),
          matched: hasEfforts,
          mode: 'insert' as const,
          note: hasEfforts ? null : '当前模型未声明推理强度档位，建议添加配置',
          warning: null,
          snippet: `llm-pi-ai:\n  providers:\n    ${provider}:\n      models:\n        - id: ${model}\n          name: ${model}\n          reasoningEfforts:\n${levels.map((l) => `            ${l.id}: "${l.id}"`).join('\n')}`,
          entryLine: `- id: ${model}`,
          entryPath: `llm-pi-ai.providers.${provider}.models`,
          settingsPath: '~/.dsh/settings.yaml',
        } satisfies AdaptGuidance,
      }
    })

    harness.handle(RPC_CHANNEL, 'store', async (args: { key: string; value: unknown }) => {
      // Read-only: we don't modify settings
      return {
        ok: true,
        value: null,
      }
    })
  },
}
