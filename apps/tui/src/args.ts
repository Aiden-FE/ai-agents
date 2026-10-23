import { parseArgs } from 'node:util';

export interface TuiArguments {
  /** Profile name passed as `--profile <name>` or `--profile=<name>`. */
  readonly profile?: string;
}

/** Parse the TUI command line while allowing unrelated arguments to pass through. */
export function parseTuiArguments(args: readonly string[] = []): TuiArguments {
  const { values } = parseArgs({
    args: [...args],
    options: {
      profile: {
        type: 'string',
      },
    },
    strict: false,
  });

  const rawProfile = values.profile;
  if (typeof rawProfile === 'string' && rawProfile.trim() === '') {
    throw new Error('The --profile option requires a non-empty profile name.');
  }

  return typeof rawProfile === 'string' ? { profile: rawProfile } : {};
}
