/** Default title shown in the terminal UI header. */
export const DEFAULT_TUI_TITLE: string = 'maka-tui'

export interface TuiConfig {
  /** Title rendered in the terminal UI header. */
  readonly title: string
}

export type TuiEnv = Readonly<Record<string, string | undefined>>

/** Resolve shell-layer configuration from a `process.env`-like record. */
export function resolveTuiConfig(env: TuiEnv = {}): TuiConfig {
  return {
    title: env.MAKA_TUI_TITLE?.trim() || DEFAULT_TUI_TITLE,
  }
}
