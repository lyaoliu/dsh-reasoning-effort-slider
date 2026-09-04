import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from './react.js'
import type { ReactKeyboardEvent } from './react.js'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ModelSelection } from '@deepseek-ai/dsh-api-remotes/client'
import type { ModelDirectory, ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import { EffortSlider } from './slider.js'
import { SettingsPanel, readEffect } from './settings.js'
import { CSS } from './styles.js'
import { enabledStore, chibiStore } from './store.js'
import type { AdaptationService, EffortLevel, VisualEffect } from './types.js'

const SLOT = 'conversation.input.model'
const SETTINGS_SLOT = 'settings.general.item'
const ADAPT_CHANNEL = '/dsh-reasoning-effort-slider'

/**
 * Ladder used when the active model advertises no efforts of its own. Mirrors
 * the host's THINKING_LEVELS vocabulary; committing one first asks the host
 * to declare these levels on the model in settings.yaml, so the selection
 * passes capability validation and survives restarts.
 */
const DEFAULT_LEVELS: readonly EffortLevel[] = [
  { id: 'off', name: 'off' },
  { id: 'minimal', name: 'minimal' },
  { id: 'low', name: 'low' },
  { id: 'medium', name: 'medium' },
  { id: 'high', name: 'high' },
  { id: 'xhigh', name: 'xhigh' },
  { id: 'max', name: 'max' },
]

interface HostRpc {
  call(channel: string, endpoint: string, payload?: unknown): Promise<unknown>
}

function makeAdaptationService(rpc: HostRpc | undefined): AdaptationService | null {
  if (rpc === undefined) return null
  const call = async <T,>(endpoint: string, payload?: unknown): Promise<T | null> => {
    try {
      const result = (await rpc.call(ADAPT_CHANNEL, endpoint, payload)) as {
        ok: boolean
        value?: T
        error?: { code: string; message: string }
      }
      if (!result.ok) {
        console.warn(`[reasoning-effort-slider] ${endpoint} failed:`, result.error?.message ?? result)
        return null
      }
      return result.value ?? null
    } catch (error) {
      console.warn(`[reasoning-effort-slider] ${endpoint} rpc error:`, error)
      return null
    }
  }
  return {
    diagnose: (provider: string, model: string) => call('diagnose', { provider, model }),
    declareEfforts: async (provider: string, model: string, allowList?: readonly string[]) =>
      (
        await call('declare-efforts', {
          provider,
          model,
          ...(allowList === undefined ? {} : { allowList: [...allowList] }),
        })
      ) !== null,
    removeEffort: async (provider: string, model: string, effortId: string) =>
      (await call('remove-effort', { provider, model, effortId })) !== null,
  }
}

/** Get the current model from the directory groups. */
function currentModel(state: ModelDirectoryState) {
  if (state.current === null) return undefined
  const group = state.groups?.find((candidate) => candidate.id === state.current?.provider)
  return group?.models?.find((candidate) => candidate.id === state.current?.model)
}

/**
 * Effort levels the slider should offer, in adapter order. Models advertising
 * at least two levels use them; everything else falls back to DEFAULT_LEVELS
 * so the slider stays usable on unconfigured models.
 */
function sliderLevels(state: ModelDirectoryState): readonly EffortLevel[] {
  const efforts = currentModel(state)?.reasoning?.efforts
  return efforts !== undefined && efforts.length >= 2 ? efforts : DEFAULT_LEVELS
}

/**
 * Hide Vision Toolkit's stealth image-input variant routes (`vision-toolkit-*`):
 * with the plugin's default hidden:true they deliberately masquerade as their
 * upstream models (same name, same model ids) so autoSwitch can reroute image
 * pastes transparently — they are not meant to be picked by hand. Also collapses
 * any residual same-id duplicates; first occurrence wins.
 */
function visibleGroups(state: ModelDirectoryState): ModelDirectoryState['groups'] {
  if (!Array.isArray(state?.groups)) return []
  const seenIds = new Set<string>()
  const groups: ModelDirectoryState['groups'][number][] = []
  for (const group of state.groups) {
    if (group.id.startsWith('vision-toolkit-')) continue
    if (seenIds.has(group.id)) continue
    seenIds.add(group.id)
    groups.push(group)
  }
  return groups
}

function effortIndex(levels: readonly EffortLevel[], id: string | undefined): number {
  return levels.findIndex((level) => level.id === id)
}

function clampIndex(value: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.round(value)))
}

/**
 * Level index the slider should rest at: the session's current effort when the
 * model still offers it, else the adapter default, else the middle level.
 */
function effectiveEffortIndex(levels: readonly EffortLevel[], state: ModelDirectoryState): number {
  const reasoning = currentModel(state)?.reasoning
  const current = effortIndex(levels, state.current?.reasoningEffort)
  if (current >= 0) return current
  const fallback = effortIndex(levels, reasoning?.defaultEffort)
  if (fallback >= 0) return fallback
  return Math.floor((levels.length - 1) / 2)
}

interface ModelSeatProps {
  readonly locked: boolean
  readonly available: boolean
  readonly controller: ModelDirectory
  readonly directory: { subscribe: (listener: () => void) => () => void; getSnapshot: () => ModelDirectoryState }
  readonly load: () => void
  readonly select: (selection: ModelSelection) => Promise<boolean>
  readonly adapt: AdaptationService | null
  /** Framework-provided conversation snapshot hook (session-scope slots). */
  readonly useSession?: <T>(selector: (snapshot: ConversationSnapshotLike) => T) => T
}

/** Structural slice of a conversation snapshot this plugin reacts to. */
interface ConversationSnapshotLike {
  nodes: readonly {
    kind?: string
    seq?: number
    message?: string
    isError?: boolean
  }[]
}

const EFFORT_ERROR_RE = /reasoning[._ ]?effort|ReasoningEffort/i

/** Latest turn-error node, or null; stable identity for useSession selectors. */
function selectLatestTurnError(snapshot: ConversationSnapshotLike): { seq: number; message: string } | null {
  // The framework-provided useSession snapshot does not always carry a
  // `nodes` array (empty session, different projection shape). The selector
  // must never throw — the slot boundary would abdicate the whole seat.
  if (!Array.isArray(snapshot?.nodes)) return null
  let latest: { seq: number; message: string } | null = null
  for (const node of snapshot.nodes) {
    if (node.kind === 'turn-error' && typeof node.seq === 'number' && typeof node.message === 'string') {
      if (latest === null || node.seq > latest.seq) latest = { seq: node.seq, message: node.message }
    }
  }
  return latest
}

/** "should be one of: low, medium, …" → the enumerated wire values. */
function extractAllowList(message: string): string[] | null {
  const match = /one of[:\s]+([A-Za-z0-9_,\s"'-]+)/i.exec(message)
  if (match === null) return null
  const tokens = match[1]
    .split(/[,\s]+/)
    .map((token) => token.replace(/["']/g, '').trim().toLowerCase())
    .filter((token) => token.length > 0)
  return tokens.length > 0 ? [...new Set(tokens)] : null
}

/** `… does not support reasoning effort "max"` → "max". */
function extractOffender(message: string): string | null {
  const match = /(?:effort|level)["':\s]+["']([a-z][a-z0-9_-]*)["']/i.exec(message)
  return match !== null ? match[1]!.toLowerCase() : null
}

function AdvancedModelSelect({ locked, available, controller, directory, load, select, adapt, useSession }: ModelSeatProps) {
  const state = useSyncExternalStore(
    (notify) => directory.subscribe(notify),
    () => directory.getSnapshot(),
  )
  const [open, setOpen] = useState(false)
  const [modelsOpen, setModelsOpen] = useState(false)
  const [effect, setEffect] = useState<VisualEffect>(readEffect)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const choice = currentModel(state)
  const levels = sliderLevels(state)
  const effortName = levels[effectiveEffortIndex(levels, state)]?.name ?? '默认'
  const modelLabel = choice?.name ?? state.current?.model ?? '选择模型'
  const busy = state.status === 'loading' || state.status === 'selecting'
  const chibi = useSyncExternalStore(chibiStore.subscribe, chibiStore.getSnapshot)

  const [effort, setEffort] = useState('')
  const [preview, setPreview] = useState(0)
  const [committing, setCommitting] = useState(false)
  const [notice, setNotice] = useState('')
  const noticeTimerRef = useRef<number | undefined>(undefined)
  const committingRef = useRef(false)
  const draggingRef = useRef(false)
  const commitQueueRef = useRef<Promise<void>>(Promise.resolve())
  const committedIdRef = useRef('')

  /** Transient explanation line under the slider; auto-clears. */
  const showNotice = useCallback((text: string) => {
    setNotice(text)
    if (noticeTimerRef.current !== undefined) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 6000)
  }, [])

  useEffect(() => {
    if (!available) return
    load()
  }, [available, load])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setModelsOpen(false)
      }
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [open])

  useEffect(() => {
    if (levels.length < 2 || committingRef.current || draggingRef.current) return
    const index = effectiveEffortIndex(levels, state)
    committedIdRef.current = levels[index]?.id ?? ''
    setEffort(committedIdRef.current)
    setPreview(index)
  }, [levels, state])

  const commit = useCallback((raw: number) => {
    commitQueueRef.current = commitQueueRef.current.then(async () => {
      if (committingRef.current) return
      committingRef.current = true
      setCommitting(true)
      const previous = committedIdRef.current
      try {
        const models = await controller.load()
        let fresh: ModelDirectoryState = {
          current: models.current,
          routable: models.routable,
          groups: models.groups,
          failures: models.failures,
          status: 'ready',
          error: null,
        }
        // Unconfigured model: persist the default ladder into settings.yaml
        // first (host writes + hot reload), then re-read so select() passes
        // the host's capability validation instead of bouncing off it.
        const advertised = currentModel(fresh)?.reasoning?.efforts
        if ((advertised === undefined || advertised.length < 2) && adapt !== null) {
          try {
            const declared = await adapt.declareEfforts(models.current.provider, models.current.model)
            if (declared) {
              const reloaded = await controller.load()
              fresh = {
                current: reloaded.current,
                routable: reloaded.routable,
                groups: reloaded.groups,
                failures: reloaded.failures,
                status: 'ready',
                error: null,
              }
            } else {
              showNotice('自动声明档位失败（原因见控制台），本次选择可能不被接受')
            }
          } catch (error) {
            showNotice(`自动声明档位失败：${error instanceof Error ? error.message : String(error)}`)
          }
        }
        // Target resolution goes through the HOST-advertised ladder only —
        // the rendered fallback (client DEFAULT_LEVELS) must never select an
        // id the host catalog does not know, or every dispatch would bounce.
        const hostLevels = currentModel(fresh)?.reasoning?.efforts ?? []
        const wantedId = levels[clampIndex(raw, levels.length)]?.id ?? ''
        const hostIndex = hostLevels.findIndex((level) => level.id === wantedId)
        if (hostIndex < 0) {
          showNotice(`宿主目录没有档位 "${wantedId}"（自动声明未生效），已取消本次选择`)
          setEffort(previous)
          setPreview(Math.max(0, effortIndex(levels, previous)))
          return
        }
        setEffort(wantedId)
        setPreview(hostIndex)
        await select({
          provider: models.current.provider,
          model: models.current.model,
          reasoningEffort: wantedId,
        })
        const snapshot = controller.store.getSnapshot()
        const accepted = effortIndex(hostLevels, snapshot.current?.reasoningEffort)
        const settled = accepted >= 0 ? accepted : hostIndex
        const settledId = hostLevels[settled]?.id ?? wantedId
        committedIdRef.current = settledId
        setEffort(settledId)
        setPreview(Math.max(0, effortIndex(levels, settledId)))
      } catch {
        setEffort(previous)
        setPreview(Math.max(0, effortIndex(levels, previous)))
      } finally {
        committingRef.current = false
        setCommitting(false)
      }
    })
    return commitQueueRef.current
  }, [adapt, controller, levels, select])

  const turnError = typeof useSession === 'function' ? useSession(selectLatestTurnError) : null
  const healSeqRef = useRef(0)

  /**
   * Self-heal a rejected effort: rewrite the declared ladder from what the
   * server said (allowlist), or drop the single offender, then re-select the
   * nearest surviving level so the session stays dispatchable.
   */
  const healFromError = useCallback(
    (message: string) => {
      if (committingRef.current || draggingRef.current) return
      const snapshot = controller.store.getSnapshot()
      const provider = snapshot.current?.provider
      const model = snapshot.current?.model
      if (provider === undefined || model === undefined || adapt === null) return
      commitQueueRef.current = commitQueueRef.current.then(async () => {
        const previousLevels = sliderLevels(controller.store.getSnapshot())
        try {
          const list = extractAllowList(message)
          let healed = false
          if (list !== null) {
            healed = await adapt.declareEfforts(provider, model, list)
          } else {
            const offender = extractOffender(message)
            if (offender !== null) healed = await adapt.removeEffort(provider, model, offender)
          }
          if (!healed) return
          await controller.load()
          const fresh = controller.store.getSnapshot()
          const freshLevels = sliderLevels({
            current: fresh.current,
            routable: fresh.routable,
            groups: fresh.groups,
            failures: fresh.failures,
            status: 'ready',
            error: null,
          })
          if (freshLevels.length === 0) return
          const committed = committedIdRef.current
          if (freshLevels.some((level) => level.id === committed)) return // still valid
          const oldIndex = previousLevels.findIndex((level) => level.id === committed)
          const target =
            oldIndex >= 0 ? clampIndex(oldIndex, freshLevels.length) : Math.floor((freshLevels.length - 1) / 2)
          await commit(target)
        } catch {
          /* healing is best-effort; the visible turn error already told the story */
        }
      })
      return commitQueueRef.current
    },
    [adapt, commit, controller],
  )

  useEffect(() => {
    if (turnError === null || adapt === null) return
    if (turnError.seq <= healSeqRef.current) return
    healSeqRef.current = turnError.seq
    if (!EFFORT_ERROR_RE.test(turnError.message)) return
    void healFromError(turnError.message)
  }, [turnError, adapt, healFromError])

  if (!available) return null

  const close = (restoreFocus = false) => {
    setOpen(false)
    setModelsOpen(false)
    if (restoreFocus) queueMicrotask(() => triggerRef.current?.focus())
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || !open) return
    event.preventDefault()
    if (modelsOpen) setModelsOpen(false)
    else close(true)
  }

  const chooseModel = async (provider: string, model: string, defaultEffort?: string) => {
    if (state.current?.provider === provider && state.current.model === model) {
      setModelsOpen(false)
      return
    }
    const accepted = await select({
      provider,
      model,
      ...(defaultEffort === undefined ? {} : { reasoningEffort: defaultEffort }),
    })
    if (accepted) setModelsOpen(false)
  }

  const onToggleOpen = () => {
    if (open) close()
    else {
      setOpen(true)
      setModelsOpen(false)
      setEffect(readEffect())
      load()
    }
  }

  return (
    <div ref={rootRef} className="re-model-root" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className="re-model-trigger"
        aria-label={`模型 ${modelLabel}，推理强度 ${effortName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${modelLabel} · ${effortName}`}
        disabled={locked}
        onClick={onToggleOpen}
      >
        <span className="re-model-name">{modelLabel}</span>
        <span className="re-model-effort">{effortName}</span>
        <span className="re-model-chevron" aria-hidden="true" />
      </button>

      {open ? (
        <div className="re-model-menu" role="menu" aria-label="模型与推理强度" aria-busy={busy}>
          {modelsOpen ? (
            <div className="re-model-pane">
              <button type="button" className="re-model-back" onClick={() => setModelsOpen(false)}>
                <span aria-hidden="true">‹</span>
                <span>选择模型</span>
              </button>
              {state.status === 'loading' && visibleGroups(state).length === 0 ? (
                <div className="re-model-status">正在加载模型…</div>
              ) : null}
              {visibleGroups(state).map((group) => (
                <section key={group.id}>
                  <div className="re-model-group-title">{group.name}</div>
                  {(group.models ?? []).map((model) => {
                    const selected = state.current?.provider === group.id && state.current?.model === model.id
                    return (
                      <button
                        key={model.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selected}
                        className="re-model-option"
                        disabled={busy}
                        onClick={() => void chooseModel(group.id, model.id, model.reasoning?.defaultEffort)}
                      >
                        <span className="re-model-option-copy">
                          <span className="re-model-option-name">{model.name}</span>
                          {model.description === undefined ? null : (
                            <span className="re-model-option-desc">{model.description}</span>
                          )}
                        </span>
                        <span className="re-model-check" aria-hidden="true">{selected ? '✓' : ''}</span>
                      </button>
                    )
                  })}
                </section>
              ))}
              {state.status === 'ready' && visibleGroups(state).every((group) => (group.models ?? []).length === 0) ? (
                <div className="re-model-status">没有可用模型</div>
              ) : null}
              {state.error === null ? null : <div className="re-model-error">{state.error}</div>}
            </div>
          ) : (
            <>
              <div className="re-advanced">
                {levels.length >= 2 ? (
                  <EffortSlider
                    levels={levels}
                    currentId={effort}
                    onEffortChange={(id) => {
                      const idx = levels.findIndex((l) => l.id === id)
                      setPreview(idx)
                      commit(idx)
                    }}
                    onDraggingChange={(dragging) => {
                      draggingRef.current = dragging
                    }}
                    visualEffect={effect}
                    chibi={chibi}
                  />
                ) : (
                  <div className="re-model-status">当前模型未提供推理强度档位</div>
                )}
                {notice === '' ? null : <div className="re-model-error">{notice}</div>}
              </div>
              <div className="re-menu-separator" />
              <button
                type="button"
                role="menuitem"
                className="re-model-row"
                disabled={busy}
                onClick={() => setModelsOpen(true)}
              >
                <span className="re-model-row-name">{modelLabel}</span>
                <span className="re-model-row-effort">{effortName}</span>
                <span className="re-row-chevron" aria-hidden="true">›</span>
              </button>
              {state.error === null ? null : <div className="re-model-error">{state.error}</div>}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

// `modelDirectories.directoryFor` internally touches `remote.session`; the
// client context must declare it (mirroring dsh-client-ui-model-selection's
// own inject list) or the service proxy throws "cannot get property
// 'remote.session' without inject" and the slot boundary abdicates us.
const inject = ['slots', 'modelDirectories', 'connection', 'remote', 'remote.session']

function apply(ctx: ClientContext) {
  const slots = ctx.get('slots')
  if (!slots) return

  const modelDirectories = ctx.get('modelDirectories') as {
    directoryFor(sessionId: string): ModelDirectory
  } | undefined
  if (modelDirectories === undefined) return

  const connection = ctx.get('connection') as { rpc?: HostRpc } | undefined
  const adapt = makeAdaptationService(connection?.rpc)

  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-reasoning-effort-slider'
    style.textContent = CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, 'reasoning-effort-slider: styles')

  // Register settings item
  ctx.slots.inject(SETTINGS_SLOT, () =>
    ctx.slots.register(
      { name: SETTINGS_SLOT, id: 'reasoning-effort-slider-enabled', order: 15 },
      () => React.createElement(SettingsPanel),
    ),
  )

  console.log('[reasoning-effort-slider] client apply called', { slots: !!slots, modelDirectories: !!modelDirectories })
  // Model seat
  ctx.slots.inject(SLOT, () => {
    console.log('[reasoning-effort-slider] slot inject callback fired')
    let disposeModelSeat: (() => void) | undefined
    const syncModelSeat = () => {
      if (!enabledStore.getSnapshot()) {
        console.log('[reasoning-effort-slider] disabled, disposing seat')
        disposeModelSeat?.()
        disposeModelSeat = undefined
        return
      }
      if (disposeModelSeat !== undefined) return
      // `conversation.input.model` is a `single` slot and the slots system
      // renders the LOWEST-priority registration (entries sorted ascending,
      // first live entry wins). The built-in seat registers at 0, so we must
      // go negative to shadow it — a positive priority would lose silently.
      console.log('[reasoning-effort-slider] registering slot with priority -100')
      disposeModelSeat = ctx.slots.register(
        {
          name: SLOT,
          priority: -100,
          inject: (sessionId: string) => {
            const controller = modelDirectories.directoryFor(sessionId)
            return {
              available: true,
              controller,
              directory: controller.store,
              load: () => controller.load().then(() => undefined, () => undefined),
              select: (selection: ModelSelection) => controller.select(selection).then(() => true, () => false),
              adapt,
            }
          },
        },
        AdvancedModelSelect,
      )
    }

    const unsubscribe = enabledStore.subscribe(syncModelSeat)
    syncModelSeat()
    return () => {
      unsubscribe()
      disposeModelSeat?.()
    }
  })
}

export default { inject, apply }