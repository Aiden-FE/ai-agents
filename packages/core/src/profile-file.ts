import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { type AgentConfig, type AgentEnv, resolveAgentConfig } from './agent.ts'
import { type ProfileConfig, parseProfileConfig, selectProfile } from './profile.ts'

/** Profile config directory under the user home directory. */
export const DEFAULT_PROFILE_DIR: string = 'maka'

/** Profile config file name. */
export const DEFAULT_PROFILE_FILE: string = 'config.yaml'

export interface ProfileFileOptions {
  /** Environment used to resolve the config path and the active profile. */
  readonly env?: AgentEnv
}

/** Resolve the config path: `MAKA_CONFIG_PATH`, else `~/maka/config.yaml`. */
export function resolveProfilePath(env: AgentEnv = {}): string {
  const override = env.MAKA_CONFIG_PATH?.trim()
  if (override) {
    return override
  }

  return join(homedir(), DEFAULT_PROFILE_DIR, DEFAULT_PROFILE_FILE)
}

/**
 * Read and validate the profile config file. A missing file yields an empty
 * config so the built-in defaults still apply.
 */
export function loadProfileConfig(options: ProfileFileOptions = {}): ProfileConfig {
  const env = options.env ?? {}
  const path = resolveProfilePath(env)

  let source: string
  try {
    source = readFileSync(path, 'utf8')
  } catch (cause) {
    if (isMissingFile(cause)) {
      return { profiles: {} }
    }

    throw new Error(`Cannot read profile config at ${path}: ${errorMessage(cause)}`)
  }

  return parseProfileConfig(source, path)
}

/**
 * Load the profile config file, select the active profile, and merge it with
 * the environment. This is the entry point every shell should call.
 */
export function loadAgentConfig(env: AgentEnv = {}): AgentConfig {
  const config = loadProfileConfig({ env })
  const profile = selectProfile(config, env.MAKA_PROFILE?.trim() || undefined)

  return resolveAgentConfig(env, profile)
}

function isMissingFile(cause: unknown): boolean {
  return (cause as NodeJS.ErrnoException | null)?.code === 'ENOENT'
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}
