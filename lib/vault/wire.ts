/**
 * Vault records as JSON for the office server. Records are already sealed in the browser; this only
 * turns their bytes (salt, IV, ciphertext) into base64 so they survive the trip.
 */

const TAG = '$bytes';

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};
const fromBase64 = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0));

export const encodeRecord = (value: unknown): string =>
  JSON.stringify(value, (_, v) => (v instanceof Uint8Array ? { [TAG]: toBase64(v) } : v));

export const decodeRecord = <T>(text: string): T =>
  JSON.parse(text, (_, v) => (v && typeof v === 'object' && typeof v[TAG] === 'string' ? fromBase64(v[TAG]) : v)) as T;

/** Slot names the vault uses; anything else is refused by the server. */
export const isVaultKey = (key: string) => /^(header|identifiers|log|doc:[\w-]{1,64}|file:[\w-]{1,64})$/.test(key);
