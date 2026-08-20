import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ModelDirectory, ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import { EffortSlider } from './slider.js'
import { SettingsPanel } from './settings.js'
import { CSS } from './styles.js'
import type { AdaptationService, EffortLevel } from './types.js'

const SLOT = 'conversation.input.model'
const SETTINGS_SLOT = 'settings.general.item'
const ENABLED_STORAGE_KEY = 'dsh-reasoning-effort-slider.enabled'
const ADAPT_CHANNEL = '/dsh-reasoning-effort-slider'

interface HostRpc {
  call(channel: string, endpoint: string, payload?: unknown): Promise<unknown>
}

function makeAdaptationService(rpc: HostRpc | undefined): AdaptationService | null {
  if (rpc === undefined) return null
  const call = async <T,>(endpoint: string, payload?: unknown): Promise<T | null> => {
    try {
      const result = (await rpc.call(ADAPT_CHANNEL, endpoint, payload)) as { ok: boolean; value?: T }
      return result.ok ? result.value ?? null : null
    } catch {
      return null
    }
  }
  return {
    diagnose: (provider: string, model: string) => call('diagnose', { provider, model }),
  }
}

/** Get the current model from the directory groups. */
function currentModel(state: ModelDirectoryState): any {
  if (state.current === null) return undefined
  const group = state.groups?.find((candidate: any) => candidate.id === state.current?.provider)
  return group?.models?.find((candidate: any) => candidate.id === state.current?.model)
}

function sliderLevels(state: ModelDirectoryState): EffortLevel[] {
  const model = currentModel(state)
  // 参考插件实现：直接从 model.reasoning.efforts 获取档位（已经是 EffortLevel[] 格式）
  const efforts = model?.reasoning?.efforts
  return efforts !== undefined && efforts.length >= 2 ? efforts : []
}

function effectiveEffortIndex(levels: EffortLevel[], state: ModelDirectoryState): number {
  const current = state.current as any
  const effortId = current?.reasoningEffort
  const idx = levels.findIndex((l) => l.id === effortId)
  if (idx >= 0) return idx
  return Math.floor((levels.length - 1) / 2)
}

const inject = ['slots', 'modelDirectories', 'connection']

function apply(ctx: ClientContext) {
  const slots = ctx.get('slots')
  if (!slots) return

  const rpc = ctx.get('connection') as { call: HostRpc['call'] } | undefined
  const adapt = makeAdaptationService(rpc)

  // Insert CSS
  ctx.get('styles')?.insert(CSS)

  slots.inject(SLOT, () => {
    slots.register(
      { name: SLOT },
      (props: any) => {
        const directory = props.directory as ModelDirectory
        const directoryState = useSyncExternalStore(
          (notify) => directory.store.subscribe(notify),
          () => directory.store.getSnapshot(),
        )

        const levels = sliderLevels(directoryState)
        const [effort, setEffort] = useState('')
        const [preview, setPreview] = useState(0)
        const [committing, setCommitting] = useState(false)

        useEffect(() => {
          if (levels.length < 2) return
          const index = effectiveEffortIndex(levels, directoryState)
          const next = levels[index]?.id ?? ''
          setEffort(next)
          setPreview(index)
        }, [levels, directoryState])

        const commit = useCallback(async (raw: number) => {
          if (committing) return
          setCommitting(true)
          const previous = effort
          try {
            const models = await directory.load()
            const freshLevels = sliderLevels({ ...directoryState, current: models.current } as ModelDirectoryState)
            const index = Math.round(raw * (freshLevels.length - 1))
            const next = freshLevels[index]?.id
            if (!next) throw new Error('No effort level available')

            await (directory as any).select({
              provider: models.current.provider,
              model: models.current.model,
              reasoningEffort: next,
            })
            setEffort(next)
            setPreview(index)
          } catch {
            setEffort(previous)
            setPreview(effectiveEffortIndex(levels, directoryState))
          } finally {
            setCommitting(false)
          }
        }, [directory, directoryState, effort, levels, committing])

        return React.createElement(EffortSlider, {
          levels,
          currentId: effort,
          onEffortChange: (id: string) => {
            const idx = levels.findIndex((l) => l.id === id)
            setPreview(idx)
            commit(idx)
          },
          visualEffect: 'radiation',
        })
      },
    )
    return () => {} // Cleanup
  })

  // Register settings item
  slots.inject(SETTINGS_SLOT, () => {
    slots.register(
      { name: SETTINGS_SLOT, id: 'reasoning-effort-slider-enabled' },
      () => React.createElement(SettingsPanel),
    )
    return () => {} // Cleanup
  })
}

export default { inject, apply }
