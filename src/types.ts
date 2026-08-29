/** One selectable effort level exactly as the owning adapter advertised it. */
export interface EffortLevel {
  readonly id: string
  readonly name: string
}

/**
 * Knowledge-base effort level: `wire` overrides the value sent on the wire
 * (`undefined` = derive: `null` for off, otherwise the id itself).
 */
export interface KnowledgeEffort extends EffortLevel {
  readonly wire?: string | null
}

/** Host RPC result envelope. */
export type ReRpcResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } }

/** One guidance result from the Host half. */
export interface AdaptGuidance {
  readonly provider: string
  readonly model: string
  readonly userDeclared: boolean
  readonly needsGuide: boolean
  readonly reason: 'missing' | 'mismatch' | 'none'
  readonly current: string[]
  readonly expected: string[]
  readonly matched: boolean
  readonly mode: 'replace' | 'insert'
  readonly note: string | null
  readonly warning: string | null
  readonly snippet: string
  readonly entryLine: string
  readonly entryPath: string
  readonly settingsPath: string | null
}

/** The client-facing guidance service (Client→Host over the Connection RPC). */
export interface AdaptationService {
  diagnose(provider: string, model: string): Promise<AdaptGuidance | null>
}

/** Visual effect mode for the slider. */
export type VisualEffect =
  | 'radiation'
  | 'particles'
  | 'gradient'
  | 'electric'
  | 'flame'
  | 'starfield'
  | 'ripple'

/** Plugin configuration. */
export interface PluginConfig {
  readonly levels?: ReadonlyArray<{ id: string; name: string }>
  readonly visualEffect?: VisualEffect
  readonly enabled?: boolean
}
