import { describe, expect, it } from 'vitest'

import {
  createAgent,
  DEFAULT_AGENT_INSTRUCTIONS,
  DEFAULT_AGENT_MODEL,
  resolveAgentConfig,
} from './agent.ts'

describe('resolveAgentConfig', () => {
  it('falls back to defaults when nothing is configured', () => {
    expect(resolveAgentConfig()).toEqual({
      model: DEFAULT_AGENT_MODEL,
      instructions: DEFAULT_AGENT_INSTRUCTIONS,
    })
  })

  it('reads a profile', () => {
    expect(
      resolveAgentConfig(
        {},
        { model: 'anthropic/claude-sonnet-4.5', instructions: 'be terse', contextSize: 200000 },
      ),
    ).toEqual({
      model: 'anthropic/claude-sonnet-4.5',
      instructions: 'be terse',
      contextSize: 200000,
    })
  })

  it('lets the environment override the profile', () => {
    expect(
      resolveAgentConfig(
        {
          MAKA_AGENT_MODEL: 'openai/gpt-5',
          MAKA_AGENT_INSTRUCTIONS: 'from env',
          MAKA_AGENT_CONTEXT_SIZE: '128000',
        },
        { model: 'gpt-5-mini', instructions: 'from profile', contextSize: 200000 },
      ),
    ).toEqual({
      model: 'openai/gpt-5',
      instructions: 'from env',
      contextSize: 128000,
    })
  })

  it('ignores an invalid context size', () => {
    expect(resolveAgentConfig({ MAKA_AGENT_CONTEXT_SIZE: 'nope' }).contextSize).toBeUndefined()
    expect(resolveAgentConfig({ MAKA_AGENT_CONTEXT_SIZE: '0' }).contextSize).toBeUndefined()
  })
})

describe('createAgent', () => {
  it('builds a ToolLoopAgent without touching the network', () => {
    const agent = createAgent({
      model: DEFAULT_AGENT_MODEL,
      instructions: 'respond briefly',
    })

    expect(agent.version).toBe('agent-v1')
  })
})
