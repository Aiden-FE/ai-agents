import { describe, expect, it } from 'vitest'

import { DEFAULT_TUI_TITLE, resolveTuiConfig } from './env.ts'

describe('resolveTuiConfig', () => {
  it('falls back to the default title when the env is empty', () => {
    expect(resolveTuiConfig()).toEqual({ title: DEFAULT_TUI_TITLE })
  })

  it('reads the title override from the env', () => {
    expect(resolveTuiConfig({ MAKA_TUI_TITLE: 'my agent' })).toEqual({
      title: 'my agent',
    })
  })
})
