import { existsSync, readFileSync } from 'node:fs';
import { merge } from 'es-toolkit';
import { parseDocument } from 'yaml';
import { prettifyError } from 'zod';
import { type PROFILE_TYPE, ProfileSchema } from './interfaces/index.ts';

export function parseProfileConfig(
  source: string,
  sourceLabel: string = 'profile config',
): PROFILE_TYPE {
  const document = parseDocument(source);
  if (document.errors.length > 0) {
    throw new Error(
      `Invalid YAML in ${sourceLabel}:\n${document.errors.map((error) => error.message).join('\n')}`,
    );
  }

  const result = ProfileSchema.safeParse(document.toJS() ?? {});
  if (!result.success) {
    throw new Error(`Invalid ${sourceLabel}:\n${prettifyError(result.error)}`);
  }

  return result.data;
}

export function loadProfile(params: {
  profilePath: string;
  extraParams?: PROFILE_TYPE;
}): PROFILE_TYPE {
  let profileData: PROFILE_TYPE = {};

  if (existsSync(params.profilePath)) {
    const fileContent = readFileSync(params.profilePath, 'utf-8');
    try {
      profileData = parseProfileConfig(fileContent);
    } catch (error) {
      console.error('Failed to parse profile file:', error);
    }
  }

  if (params.extraParams) {
    profileData = merge(profileData, params.extraParams);
  }

  validateProfile(profileData);

  return profileData;
}

export function validateProfile(profile: unknown) {
  const result = ProfileSchema.safeParse(profile);
  if (!result.success) {
    throw new Error(`Invalid profile:\n${prettifyError(result.error)}`);
  }
  return true;
}
