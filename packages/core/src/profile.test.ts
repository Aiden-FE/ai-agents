import { describe, expect, it } from 'vitest'

import {
  agentProfileSchema,
  parseProfileConfig,
  profileConfigSchema,
  selectProfile,
} from './profile.ts'

describe('profileConfigSchema', () => {
  it('accepts a config file with named profiles', () => {
    const result = profileConfigSchema.safeParse({
      defaultProfile: 'work',
      profiles: { work: { model: 'gpt-5-mini' } },
    })

    expect(result.success).toBe(true)
  })

  it('rejects unknown keys', () => {
    const result = profileConfigSchema.safeParse({
      profiles: { work: { model: 'gpt-5-mini', tempreature: 1 } },
    })

    expect(result.success).toBe(false)
  })

  it('rejects an invalid profile value type', () => {
    expect(agentProfileSchema.safeParse({ contextSize: '128000' }).success).toBe(false)
    expect(agentProfileSchema.safeParse({ contextSize: -1 }).success).toBe(false)
    expect(agentProfileSchema.safeParse({ model: '' }).success).toBe(false)
  })

  it('defaults to no profiles', () => {
    const result = profileConfigSchema.parse({})

    expect(result.profiles).toEqual({})
  })
})

describe('parseProfileConfig', () => {
  it('parses and validates YAML source', () => {
    const config = parseProfileConfig(
      ['defaultProfile: work', 'profiles:', '  work:', '    model: gpt-5-mini', ''].join('\n'),
      'test.yaml',
    )

    expect(config.defaultProfile).toBe('work')
    expect(config.profiles.work).toEqual({ model: 'gpt-5-mini' })
  })

  it('treats an empty document as an empty config', () => {
    expect(parseProfileConfig('', 'test.yaml').profiles).toEqual({})
  })

  it('reports the source label on a schema violation', () => {
    expect(() => parseProfileConfig('profiles:\n  work:\n    nope: 1\n', 'test.yaml')).toThrow(
      /test\.yaml/,
    )
  })

  it('reports the source label on invalid YAML', () => {
    expect(() => parseProfileConfig('profiles: [', 'test.yaml')).toThrow(/Invalid YAML/)
  })
})

describe('selectProfile', () => {
  const config = {
    defaultProfile: 'work',
    profiles: {
      work: { model: 'gpt-5-mini' },
      personal: { instructions: 'be terse' },
    },
  }

  it('selects a profile by name', () => {
    expect(selectProfile(config, 'personal')).toEqual({ instructions: 'be terse' })
  })

  it('falls back to the default profile', () => {
    expect(selectProfile(config)).toEqual({ model: 'gpt-5-mini' })
  })

  it('returns an empty profile when nothing is configured', () => {
    expect(selectProfile({ profiles: {} })).toEqual({})
  })

  it('rejects an unknown profile name', () => {
    expect(() => selectProfile(config, 'nope')).toThrow(/Unknown profile "nope"/)
  })

  it('rejects an ambiguous config with no default', () => {
    expect(() => selectProfile({ profiles: { work: {} } })).toThrow(/No profile selected/)
  })
})
