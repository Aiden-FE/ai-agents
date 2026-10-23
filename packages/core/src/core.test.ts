import { expect, test } from 'vitest';
import { resolveModel } from './core.ts';

type ModelMetadata = { provider: string; modelId: string };

test('resolves an OpenAI completion model', () => {
  const model = resolveModel({
    defaultProvider: 'local',
    defaultModel: 'completion-model',
    providers: [
      {
        name: 'local',
        baseUrl: 'http://127.0.0.1',
        apiKey: 'key',
        protocol: 'openai-completion',
      },
    ],
  });

  expect(model as ModelMetadata).toMatchObject({
    provider: 'local.completion',
    modelId: 'completion-model',
  });
});

test('resolves an OpenAI response model', () => {
  const model = resolveModel({
    defaultProvider: 'local',
    defaultModel: 'response-model',
    providers: [
      {
        name: 'local',
        baseUrl: 'http://127.0.0.1',
        apiKey: 'key',
        protocol: 'openai-response',
      },
    ],
  });

  expect(model as ModelMetadata).toMatchObject({
    provider: 'local.responses',
    modelId: 'response-model',
  });
});

test('resolves API keys from an environment variable', () => {
  process.env.TEST_PROVIDER_KEY = 'secret';

  const model = resolveModel({
    defaultProvider: 'local',
    defaultModel: 'completion-model',
    providers: [
      {
        name: 'local',
        baseUrl: 'http://127.0.0.1',
        apiKey: '$TEST_PROVIDER_KEY',
        protocol: 'openai-completion',
      },
    ],
  });

  expect(model as ModelMetadata).toMatchObject({ provider: 'local.completion' });
  delete process.env.TEST_PROVIDER_KEY;
});
