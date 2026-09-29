import { parseDocument } from 'yaml'
import { prettifyError, z } from 'zod'

/**
 * A single named profile. Every field is optional, so a profile only overrides
 * what it declares.
 */
export interface AgentProfile {
  /** Model id resolved through the AI SDK provider. */
  readonly model?: string
  /** System instructions for the agent. */
  readonly instructions?: string
  /** Model context window size in tokens, used for the usage readout. */
  readonly contextSize?: number
}

/** The profile config file, e.g. `~/maka/config.yaml`. */
export interface ProfileConfig {
  /** Profile used when none is selected explicitly. */
  readonly defaultProfile?: string
  /** Named profiles available to every shell. */
  readonly profiles: Readonly<Record<string, AgentProfile>>
}

/**
 * Schema constraining a single profile. Unknown keys are rejected so typos in
 * the config file fail loudly instead of being ignored.
 */
export const agentProfileSchema: z.ZodType<AgentProfile> = z.strictObject({
  model: z.string().min(1).optional(),
  instructions: z.string().min(1).optional(),
  contextSize: z.number().int().positive().optional(),
})

/** Schema constraining the whole profile config file. Rejects unknown keys. */
export const profileConfigSchema: z.ZodType<ProfileConfig> = z.strictObject({
  defaultProfile: z.string().min(1).optional(),
  profiles: z.record(z.string().min(1), agentProfileSchema).default({}),
})

/**
 * Parse and validate profile config YAML. Throws with the offending path and
 * schema issues so a broken config file is easy to fix.
 */
export function parseProfileConfig(
  source: string,
  sourceLabel: string = 'profile config',
): ProfileConfig {
  const document = parseDocument(source)
  if (document.errors.length > 0) {
    throw new Error(
      `Invalid YAML in ${sourceLabel}:\n${document.errors.map((error) => error.message).join('\n')}`,
    )
  }

  const result = profileConfigSchema.safeParse(document.toJS() ?? {})
  if (!result.success) {
    throw new Error(`Invalid ${sourceLabel}:\n${prettifyError(result.error)}`)
  }

  return result.data
}

/**
 * Pick a profile by name, falling back to `defaultProfile`. Throws when the
 * selection is ambiguous or names a profile that does not exist.
 */
export function selectProfile(config: ProfileConfig, name?: string): AgentProfile {
  if (name !== undefined) {
    return requireProfile(config.profiles, name)
  }

  if (config.defaultProfile !== undefined) {
    return requireProfile(config.profiles, config.defaultProfile)
  }

  const available = Object.keys(config.profiles)
  if (available.length === 0) {
    return {}
  }

  throw new Error(
    `No profile selected. Set "defaultProfile" in the profile config or pick one of: ${available.join(', ')}`,
  )
}

function requireProfile(
  profiles: Readonly<Record<string, AgentProfile>>,
  name: string,
): AgentProfile {
  const profile = profiles[name]
  if (profile === undefined) {
    const available = Object.keys(profiles)
    throw new Error(
      `Unknown profile "${name}". Available profiles: ${available.length === 0 ? 'none' : available.join(', ')}`,
    )
  }

  return profile
}
