import { describe, expect, it } from 'vitest'

import packageJson from '../package.json'
import { Core, createCore, hello, VERSION } from './index.ts'

describe('hello', () => {
  it('greets the default world', () => {
    expect(hello()).toBe('Hello, world!')
  })

  it('greets a named user', () => {
    expect(hello('maka')).toBe('Hello, maka!')
  })
})

describe('Core', () => {
  it('creates an instance with the default name and package version', () => {
    const core = createCore()

    expect(core).toBeInstanceOf(Core)
    expect(VERSION).toBe(packageJson.version)
    expect(core.snapshot()).toEqual({
      name: 'ai-agents',
      version: VERSION,
    })
  })

  it('preserves the configured name in its snapshot', () => {
    expect(createCore({ name: 'my-agent' }).snapshot()).toEqual({
      name: 'my-agent',
      version: VERSION,
    })
  })
})
