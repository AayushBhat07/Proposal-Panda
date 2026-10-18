/** What the vault writes to its access log. The server refuses any other action. */
export const VAULT_ACTIONS = [
  'unlocked',
  'uploaded',
  'opened',
  'deleted',
  'saved identifiers',
  'exported bid',
  'built bundle',
  'moved to server',
  'erased',
] as const;

export type VaultAction = (typeof VAULT_ACTIONS)[number];
