import { describe, expect, it } from 'vitest';

import { parseTuiArguments } from './args.ts';

describe('parseTuiArguments', () => {
  it('returns no profile when the option is absent', () => {
    expect(parseTuiArguments([])).toEqual({});
  });

  it('reads the space-separated profile value', () => {
    expect(parseTuiArguments(['--profile', 'work'])).toEqual({ profile: 'work' });
  });

  it('reads the equals-separated profile value', () => {
    expect(parseTuiArguments(['--profile=personal'])).toEqual({ profile: 'personal' });
  });

  it('rejects an empty profile name', () => {
    expect(() => parseTuiArguments(['--profile='])).toThrow(
      'The --profile option requires a non-empty profile name.',
    );
  });
});
