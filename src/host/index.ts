/**
 * Host half: read-only reasoning-effort guidance.
 *
 * Mirrors the reference plugin's contract: named `name` / `inject` / `apply`
 * exports, with the RPC channel mounted through `ctx.inject(['connection'])`
 * so terminal-only profiles (no connection service) never block this row.
 *
 * @module dsh-reasoning-effort-slider
 */
import type { EffortLevel, KnowledgeEffort, PluginConfig } from '../types.js'
import { DEFAULT_LEVELS, getEffortLevels } from './knowledge.js'

export const name = 'dsh-reasoning-effort-slider'

/**
 * Hard dependencies: the loader waits for these services before calling
 * `apply`. `connection` is deliberately absent — only Web profiles provide
 * it, so the RPC channel is mounted through `ctx.inject` instead.
 */
export const inject = ['settings', 'llm']

/** Plugin-owned settings namespace (user-extensible levels / effects). */
const STORE_NS = 'dsh-reasoning-effort'
/** The DSH namespace holding per-provider model declarations. */
const LLM_NS = 'llm-pi-ai'
/** Loopback RPC channel shared with the browser half. */
const RPC_CHANNEL = '/dsh-reasoning-effort-slider'

/** Wire spellings we accept when a server enumerates its own allowlist. */
const KNOWN_WIRE = new Set(['off', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])
const CHINESE_NAMES: Record<string, string> = {
  off: '关闭',
  minimal: '极低',
  low: '低',
  medium: '中',
  high: '高',
  xhigh: '极高',
  max: '最大',
}

interface HostSettingsDescriptor {
  ns: string
  user?: unknown
}

interface HostSettingsService {
  get(ns: string): unknown
  describe?(options?: { redactSecrets?: boolean }): HostSettingsDescriptor[]
  update?(ns: string, patch: unknown): Promise<void>
}

interface HostLlmService {
  resolveModelInfo(provider: string, model: string): Promise<{
    reasoning?: { efforts: Array<{ id: string; name: string }>; defaultEffort?: string }
  }>
}

interface HostConnection {
  rpc: {
    handle(
      channel: string,
      handler: (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<unknown>,
      options: { authority: 'loopback' | 'trusted-host' },
    ): () => Promise<void>
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type JsonObject = Record<string, any>

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function okResult(value: unknown): JsonObject {
  return { ok: true, value }
}

function failResult(code: string, message: string): JsonObject {
  return { ok: false, error: { code, message } }
}

/** Read plugin config from the settings namespace, applying defaults. */
function readPluginConfig(settings: HostSettingsService): PluginConfig {
  const ns = settings.get(STORE_NS)
  return {
    enabled: true,
    visualEffect: 'radiation',
    ...(isRecord(ns) ? ns : {}),
  }
}

/**
 * Field block (10-space indent) to paste under an existing `models` list
 * entry. Deliberately NOT a full `llm-pi-ai:` root — pasting a whole root
 * into an existing settings.yaml creates a duplicate root and breaks the
 * document.
 */
function fieldBlock(model: string, levels: EffortLevel[]): string {
  const lines: string[] = [`- id: ${model}`, '          reasoningEfforts:']
  for (const level of levels) lines.push(`            ${level.id}: ${JSON.stringify(level.id)}`)
  return lines.join('\n')
}

export function apply(ctx: any): void {
  const settings = ctx.get('settings') as HostSettingsService | undefined
  const llm = ctx.get('llm') as HostLlmService | undefined
  if (settings === undefined || llm === undefined) return
  const settingsService = settings
  const llmService = llm

  /** Current directory levels for one model; [] when the model offers none. */
  async function currentLevels(provider: string, model: string): Promise<string[]> {
    try {
      const info = await llmService.resolveModelInfo(provider, model)
      return (info.reasoning?.efforts ?? []).map((effort) => effort.id)
    } catch {
      return []
    }
  }

  async function diagnose(provider: string, model: string) {
    const current = await currentLevels(provider, model)
    const config = readPluginConfig(settingsService)
    const levels = getEffortLevels(provider, model, config.levels as EffortLevel[] | undefined)
    const hasEfforts = current.length >= 2

    return {
      provider,
      model,
      userDeclared: false,
      needsGuide: !hasEfforts,
      reason: hasEfforts ? ('none' as const) : ('missing' as const),
      current,
      expected: levels.map((level) => level.id),
      matched: hasEfforts,
      mode: 'insert' as const,
      note: hasEfforts ? null : '当前模型未声明推理强度档位，建议添加配置',
      warning: null,
      snippet: fieldBlock(model, levels),
      entryLine: `- id: ${model}`,
      entryPath: `${LLM_NS}.providers.${provider}.models`,
      settingsPath: '~/.dsh/settings.yaml',
    }
  }

  /** Raw user-layer section for one namespace; null when unavailable. */
  function llmUserSection(): JsonObject | null {
    if (typeof settingsService.describe !== 'function') return null
    let descriptors: HostSettingsDescriptor[]
    try {
      descriptors = settingsService.describe()
    } catch {
      return null
    }
    if (!Array.isArray(descriptors)) return null
    const hit = descriptors.find((descriptor) => isRecord(descriptor) && descriptor.ns === LLM_NS)
    return hit !== undefined && isRecord(hit.user) ? hit.user : null
  }

  /** Build the declarable ladder from wire values a server enumerated. */
  function ladderFromWireValues(values: readonly string[]): EffortLevel[] {
    const lowered = [...new Set(values.map((value) => value.toLowerCase()))]
    const out: KnowledgeEffort[] = [
      { id: 'off', name: '关闭', wire: lowered.includes('none') ? 'none' : null },
    ]
    for (const id of ['minimal', 'low', 'medium', 'high', 'xhigh', 'max']) {
      if (lowered.includes(id)) out.push({ id, name: CHINESE_NAMES[id] ?? id, wire: id })
    }
    return out.length > 1 ? out : DEFAULT_LEVELS
  }

  /**
   * Write a reasoningEfforts ladder onto one model entry in the live settings
   * document. The settings service persists to settings.yaml and pi-ai's
   * onChange hook rebuilds the provider directory in place — no restart. The
   * patch carries the FULL models array (arrays replace wholesale on merge;
   * sibling provider keys survive via deep merge), so it is built from the
   * current user layer, never from the resolved view.
   *
   * Ladder source, highest priority first: caller-supplied wire values (the
   * server's own rejection list), user-configured levels, built-in model
   * knowledge, then the standard seven-level ladder.
   */
  async function declareEfforts(provider: string, model: string, allowList?: readonly string[]): Promise<JsonObject> {
    if (typeof settingsService.update !== 'function') {
      throw new Error('settings service does not accept writes')
    }
    const located = locateModelEntry(provider, model)
    const config = readPluginConfig(settingsService)
    const customLevels = config.levels as EffortLevel[] | undefined
    let levels: EffortLevel[]
    if (allowList !== undefined) {
      levels = ladderFromWireValues(allowList)
    } else if (customLevels !== undefined && customLevels.length > 0) {
      levels = customLevels
    } else {
      levels = getEffortLevels(provider, model)
    }
    await writeModelLadder(located.provider, located.models, located.index, levels)
    return { provider, model, declared: levels.map((level) => level.id) }
  }

  /** Drop one unsupported level from a model's declared ladder. */
  async function removeEffort(provider: string, model: string, effortId: string): Promise<JsonObject> {
    if (typeof settingsService.update !== 'function') {
      throw new Error('settings service does not accept writes')
    }
    const located = locateModelEntry(provider, model)
    const entry = located.models[located.index]
    if (!isRecord(entry)) {
      throw new Error(`settings.yaml 的 ${provider}/${model} 条目损坏，无法移除档位`)
    }
    const efforts = isRecord(entry.reasoningEfforts) ? entry.reasoningEfforts : null
    if (efforts === null || !(effortId in efforts)) {
      return { provider, model, removed: false, remaining: Object.keys(efforts ?? {}) }
    }
    const next: JsonObject = { ...entry, reasoningEfforts: { ...efforts } }
    delete (next.reasoningEfforts as JsonObject)[effortId]
    const nextModels = located.models.map((candidate, at) => (at === located.index ? next : candidate))
    await settingsService.update(LLM_NS, { providers: { [provider]: { models: nextModels } } })
    return { provider, model, removed: true, remaining: Object.keys(next.reasoningEfforts as JsonObject) }
  }

  interface LocatedEntry {
    provider: string
    models: unknown[]
    index: number
  }

  /** Find one model entry inside the raw llm-pi-ai user layer. */
  function locateModelEntry(provider: string, model: string): LocatedEntry {
    const user = llmUserSection()
    const providers = user !== null && isRecord(user.providers) ? user.providers : null
    const route = providers !== null && isRecord(providers[provider]) ? providers[provider] : null
    const models = route !== null && Array.isArray(route.models) ? route.models : null
    if (models === null) {
      throw new Error(`settings.yaml 中找不到 ${LLM_NS}.providers.${provider}.models，无法自动写入档位`)
    }
    const index = models.findIndex((entry) => isRecord(entry) && entry.id === model)
    if (index < 0) {
      throw new Error(`settings.yaml 的 ${provider} 下没有模型 ${model}，无法自动写入档位`)
    }
    return { provider, models, index }
  }

  /** Persist one entry's ladder plus the system-role compat pin. */
  async function writeModelLadder(
    provider: string,
    models: unknown[],
    index: number,
    levels: EffortLevel[],
  ): Promise<void> {
    if (typeof settingsService.update !== 'function') {
      throw new Error('settings service does not accept writes')
    }
    const efforts: Record<string, string | null> = {}
    for (const level of levels) {
      const known = level as KnowledgeEffort
      efforts[level.id] =
        known.wire !== undefined ? known.wire : level.id === 'off' ? null : level.id
    }
    // Declaring reasoning flips pi-ai's serializer to the OpenAI-only
    // `developer` system role (`model.reasoning && supportsDeveloperRole`);
    // third-party OpenAI-compatible endpoints reject it. Pin the universal
    // `system` role unless the user chose a value themselves.
    const nextModels = models.map((entry, at) => {
      if (at !== index || !isRecord(entry)) return entry
      const compat = isRecord(entry.compat) ? entry.compat : {}
      const pinned =
        typeof compat.supportsDeveloperRole === 'boolean'
          ? {}
          : { compat: { ...compat, supportsDeveloperRole: false } }
      return { ...entry, reasoningEfforts: efforts, ...pinned }
    })
    await settingsService.update(LLM_NS, { providers: { [provider]: { models: nextModels } } })
  }

  // Only Web profiles provide `connection`; mount the channel there without
  // ever blocking this row in terminal-only profiles.
  ctx.inject(['connection'], (connectionCtx: any) => {
    const connection = connectionCtx.connection as HostConnection | undefined
    if (connection === undefined) return
    connection.rpc.handle(
      RPC_CHANNEL,
      async (endpoint, payload) => {
        switch (endpoint) {
          case 'diagnose': {
            const request = isRecord(payload) ? payload : {}
            const provider = typeof request.provider === 'string' ? request.provider : ''
            const model = typeof request.model === 'string' ? request.model : ''
            if (provider.length === 0 || model.length === 0) {
              return failResult('invalid-request', 'provider and model are required')
            }
            try {
              return okResult(await diagnose(provider, model))
            } catch (error) {
              return failResult('diagnose-failed', `diagnose failed: ${error instanceof Error ? error.message : String(error)}`)
            }
          }
          case 'store':
            return okResult(readPluginConfig(settingsService))
          case 'declare-efforts': {
            const request = isRecord(payload) ? payload : {}
            const provider = typeof request.provider === 'string' ? request.provider : ''
            const model = typeof request.model === 'string' ? request.model : ''
            if (provider.length === 0 || model.length === 0) {
              return failResult('invalid-request', 'provider and model are required')
            }
            const rawList = request.allowList
            const allowList = Array.isArray(rawList)
              ? rawList.filter((value): value is string => typeof value === 'string' && value.length > 0)
              : undefined
            try {
              return okResult(await declareEfforts(provider, model, allowList))
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error)
              ctx.logger?.warn?.(`[reasoning-effort-slider] declare-efforts ${provider}/${model} failed: ${message}`)
              return failResult('declare-failed', message)
            }
          }
          case 'remove-effort': {
            const request = isRecord(payload) ? payload : {}
            const provider = typeof request.provider === 'string' ? request.provider : ''
            const model = typeof request.model === 'string' ? request.model : ''
            const effortId = typeof request.effortId === 'string' ? request.effortId : ''
            if (provider.length === 0 || model.length === 0 || effortId.length === 0) {
              return failResult('invalid-request', 'provider, model and effortId are required')
            }
            try {
              return okResult(await removeEffort(provider, model, effortId))
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error)
              ctx.logger?.warn?.(`[reasoning-effort-slider] remove-effort ${provider}/${model}/${effortId} failed: ${message}`)
              return failResult('remove-failed', message)
            }
          }
          default:
            return failResult('not-found', `unknown endpoint ${JSON.stringify(endpoint)}`)
        }
      },
      { authority: 'loopback' },
    )
  })
}
