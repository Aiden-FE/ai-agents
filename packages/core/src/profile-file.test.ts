import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_PROFILE_DIR,
  DEFAULT_PROFILE_FILE,
  loadAgentConfig,
  loadProfileConfig,
  resolveProfilePath,
} from './profile-file.ts'

describe('resolveProfilePath', () => {
  it('defaults to ~/maka/config.yaml', () => {
    expect(resolveProfilePath()).toBe(join(homedir(), DEFAULT_PROFILE_DIR, DEFAULT_PROFILE_FILE))
  })

  it('prefers MAKA_CONFIG_PATH', () => {
    expect(resolveProfilePath({ MAKA_CONFIG_PATH: '/tmp/custom.yaml' })).toBe('/tmp/custom.yaml')
  })
})

describe('profile file loading', () => {
  let dir: string
  let configPath: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'maka-core-'))
    configPath = join(dir, 'config.yaml')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('yields an empty config when the file does not exist', () => {
    const config = loadProfileConfig({ env: { MAKA_CONFIG_PATH: configPath } })

    expect(config.profiles).toEqual({})
    expect(loadAgentConfig({ MAKA_CONFIG_PATH: configPath }).model).toBe('gpt-5-mini')
  })

  it('reports the path when the file is invalid', () => {
    writeFileSync(configPath, 'profiles:\n  work:\n    nope: 1\n')

    expect(() => loadProfileConfig({ env: { MAKA_CONFIG_PATH: configPath } })).toThrow(
      new RegExp(configPath.replaceAll('.', '\\.')),
    )
  })

  it('merges the selected profile into the agent config', () => {
    writeFileSync(
      configPath,
      [
        'defaultProfile: work',
        'profiles:',
        '  work:',
        '    model: anthropic/claude-sonnet-4.5',
        '    contextSize: 200000',
        '  personal:',
        '    model: gpt-5-mini',
        '',
      ].join('\n'),
    )

    expect(loadAgentConfig({ MAKA_CONFIG_PATH: configPath })).toEqual({
      model: 'anthropic/claude-sonnet-4.5',
      instructions: expect.any(String),
      contextSize: 200000,
    })

    expect(loadAgentConfig({ MAKA_CONFIG_PATH: configPath, MAKA_PROFILE: 'personal' }).model).toBe(
      'gpt-5-mini',
    )
  })

  it('lets the environment win over the profile', () => {
    writeFileSync(configPath, ['profiles:', '  work:', '    model: gpt-5-mini', ''].join('\n'))

    expect(
      loadAgentConfig({
        MAKA_CONFIG_PATH: configPath,
        MAKA_PROFILE: 'work',
        MAKA_AGENT_MODEL: 'openai/gpt-5',
      }).model,
    ).toBe('openai/gpt-5')
  })
})
