import { describe, expect, it } from 'vitest'
import { hello } from './index.ts'

describe('hello', () => {
  it('greets the default world', () => {
    expect(hello()).toBe('Hello, world!')
  })

  it('greets a named user', () => {
    expect(hello('maka')).toBe('Hello, maka!')
  })
})
