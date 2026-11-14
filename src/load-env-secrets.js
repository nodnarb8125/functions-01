import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SECRETS_PATH = path.join(import.meta.dirname, '../.env.secrets.json');

/**
 * Merge gitignored secrets into process.env for the active NODE_ENV profile.
 */
export default function loadEnvSecrets() {
  if (!existsSync(SECRETS_PATH)) return;

  const profile = process.env.NODE_ENV?.trim() || 'development';
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(SECRETS_PATH, 'utf8'));
  } catch {
    throw new Error(`Could not parse ${SECRETS_PATH}`);
  }

  const vars = parsed[profile];
  if (!vars || typeof vars !== 'object') return;

  for (const [name, value] of Object.entries(vars)) {
    if (value == null || String(value).trim() === '') continue;
    process.env[name] = String(value);
  }
}