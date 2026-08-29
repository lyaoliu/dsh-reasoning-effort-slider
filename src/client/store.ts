import { useSyncExternalStore } from './react.js'

const ENABLED_STORAGE_KEY = 'dsh-reasoning-effort-slider.enabled'
const CHIBI_STORAGE_KEY = 'dsh-reasoning-effort-slider.chibi-thumb'

function readEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

function readChibi(): boolean {
  try {
    return localStorage.getItem(CHIBI_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

let enabledPreference = readEnabled()
const enabledListeners = new Set<() => void>()

export const enabledStore = {
  getSnapshot: () => enabledPreference,
  subscribe: (listener: () => void) => {
    enabledListeners.add(listener)
    return () => enabledListeners.delete(listener)
  },
  set: (enabled: boolean) => {
    if (enabledPreference === enabled) return
    enabledPreference = enabled
    try {
      localStorage.setItem(ENABLED_STORAGE_KEY, String(enabled))
    } catch {}
    enabledListeners.forEach((listener) => listener())
  },
}

let chibiPreference = readChibi()
const chibiListeners = new Set<() => void>()

export const chibiStore = {
  getSnapshot: () => chibiPreference,
  subscribe: (listener: () => void) => {
    chibiListeners.add(listener)
    return () => chibiListeners.delete(listener)
  },
  set: (enabled: boolean) => {
    if (chibiPreference === enabled) return
    chibiPreference = enabled
    try {
      localStorage.setItem(CHIBI_STORAGE_KEY, String(enabled))
    } catch {}
    chibiListeners.forEach((listener) => listener())
  },
}

export function useEnabled(): boolean {
  return useSyncExternalStore(enabledStore.subscribe, enabledStore.getSnapshot)
}