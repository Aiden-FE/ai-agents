import packageJson from '../package.json' with { type: 'json' }

/** The public version of the core package, read from package.json. */
export const VERSION: string = packageJson.version

export interface CoreOptions {
  /** A human-readable name for this core instance. */
  name?: string
}

export interface CoreSnapshot {
  readonly name: string
  readonly version: string
}

/**
 * Minimal core runtime that can be extended without coupling consumers to the
 * package's internal implementation.
 */
export class Core {
  readonly #name: string

  constructor(options: CoreOptions = {}) {
    this.#name = options.name ?? 'ai-agents'
  }

  snapshot(): CoreSnapshot {
    return {
      name: this.#name,
      version: VERSION,
    }
  }
}

/** Create a configured {@link Core} instance. */
export function createCore(options?: CoreOptions): Core {
  return new Core(options)
}

export function hello(name: string = 'world'): string {
  return `Hello, ${name}!`
}
