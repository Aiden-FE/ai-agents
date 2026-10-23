import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { type LanguageModel, ToolLoopAgent } from 'ai';
import packageJson from '../package.json' with { type: 'json' };
import type { PROFILE_TYPE } from './interfaces';

/** The public version of the core package, read from package.json. */
export const VERSION: string = packageJson.version;

export interface CoreOptions {
  /** A human-readable name for this core instance. */
  name?: string;
  profile?: PROFILE_TYPE;
}

export function resolveModel(profile: PROFILE_TYPE = {}): LanguageModel {
  const providerName = profile.defaultProvider ?? profile.providers?.[0]?.name;
  const provider = profile.providers?.find((candidate) => candidate.name === providerName);

  if (!provider) {
    const availableProviders = profile.providers?.map(({ name }) => name) ?? [];
    throw new Error(
      availableProviders.length === 0
        ? 'Profile must define at least one provider.'
        : `Provider "${providerName}" was not found. Available providers: ${availableProviders.join(', ')}.`,
    );
  }

  const apiKey = provider.apiKey?.startsWith('$')
    ? process.env[provider.apiKey.slice(1)]
    : provider.apiKey;

  if (!apiKey) {
    throw new Error(
      `Provider "${provider.name}" has no API key. Set it directly or through its environment variable.`,
    );
  }

  if (!profile.defaultModel) {
    throw new Error(`Profile must define defaultModel for provider "${provider.name}".`);
  }

  const aiProvider = createOpenAICompatible({
    name: provider.name,
    baseURL: provider.baseUrl,
    apiKey,
  });

  if (provider.protocol === 'openai-response') {
    const openAiProvider = createOpenAI({
      name: provider.name,
      baseURL: provider.baseUrl,
      apiKey,
    });
    return openAiProvider.responses(profile.defaultModel);
  }

  return aiProvider.completionModel(profile.defaultModel);
}

export interface CoreSnapshot {
  readonly name: string;
  readonly version: string;
}

/**
 * Minimal core runtime that can be extended without coupling consumers to the
 * package's internal implementation.
 */
export class AgentCore {
  readonly #name: string;

  readonly agent: ToolLoopAgent;

  constructor(options: CoreOptions = {}) {
    this.#name = options.name ?? 'Maka Agent';
    this.agent = this.createAgent(options.profile);
  }

  snapshot(): CoreSnapshot {
    return {
      name: this.#name,
      version: VERSION,
    };
  }

  private createAgent(profile?: PROFILE_TYPE) {
    return new ToolLoopAgent({
      model: resolveModel(profile),
      instructions: '',
      tools: {},
    });
  }
}
