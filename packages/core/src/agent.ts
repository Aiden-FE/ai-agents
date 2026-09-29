import { gateway, ToolLoopAgent } from 'ai'

import type { AgentProfile } from './profile.ts'

export type { ToolLoopAgent } from 'ai'

/** Default model id, resolved through the Vercel AI Gateway. */
export const DEFAULT_AGENT_MODEL: string = 'gpt-5-mini'

/** Default system instructions used when no profile or env overrides them. */
export const DEFAULT_AGENT_INSTRUCTIONS: string = 'You are a helpful assistant. Answer in markdown.'

/** A `process.env`-like record. Passed in so this layer stays side-effect free. */
export type AgentEnv = Readonly<Record<string, string | undefined>>

/** Fully resolved agent settings, ready for {@link createAgent}. */
export interface AgentConfig {
  /** Model id resolved through the gateway. */
  readonly model: string
  /** System instructions for the agent. */
  readonly instructions: string
  /** Model context window size in tokens, used for the usage readout. */
  readonly contextSize?: number
}

/**
 * Merge agent settings from every layer. Precedence, lowest first: built-in
 * defaults, the selected profile, then `MAKA_AGENT_*` environment overrides.
 */
export function resolveAgentConfig(env: AgentEnv = {}, profile: AgentProfile = {}): AgentConfig {
  const model = env.MAKA_AGENT_MODEL?.trim() || profile.model || DEFAULT_AGENT_MODEL
  const instructions =
    env.MAKA_AGENT_INSTRUCTIONS?.trim() || profile.instructions || DEFAULT_AGENT_INSTRUCTIONS
  const contextSize = parseContextSize(env.MAKA_AGENT_CONTEXT_SIZE) ?? profile.contextSize

  return {
    model,
    instructions,
    ...(contextSize === undefined ? {} : { contextSize }),
  }
}

/** Create the gateway-backed {@link ToolLoopAgent} described by `config`. */
export function createAgent(config: AgentConfig): ToolLoopAgent {
  return new ToolLoopAgent({
    model: gateway(config.model),
    instructions: config.instructions,
  })
}

/** Invalid values are ignored so a typo cannot take down a whole shell. */
function parseContextSize(raw: string | undefined): number | undefined {
  const value = Number.parseInt(raw?.trim() ?? '', 10)
  return Number.isFinite(value) && value > 0 ? value : undefined
}
