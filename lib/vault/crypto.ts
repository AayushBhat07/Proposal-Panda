/**
 * Encryption for the document vault, using the browser's Web Crypto API only.
 *
 * - The key is derived from the vault passphrase with PBKDF2-SHA-256 (600,000 iterations, per OWASP 2023)
 *   and a random 16-byte salt. It is non-extractable and lives only in memory while the vault is unlocked.
 * - Each record is sealed with AES-256-GCM under a fresh 12-byte IV. The record's storage key is passed as
 *   additional authenticated data, so a ciphertext copied into another slot fails to open.
 */

export const PBKDF2_ITERATIONS = 600_000;

export interface Sealed {
  iv: Uint8Array;
  data: Uint8Array;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export async function deriveKey(passphrase: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function seal(key: CryptoKey, slot: string, plain: Uint8Array): Promise<Sealed> {
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, additionalData: encoder.encode(slot) },
    key,
    plain as BufferSource
  );
  return { iv, data: new Uint8Array(data) };
}

/** Throws when the key is wrong, the data was altered, or it was sealed for another slot. */
export async function open(key: CryptoKey, slot: string, sealed: Sealed): Promise<Uint8Array> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: sealed.iv as BufferSource, additionalData: encoder.encode(slot) },
    key,
    sealed.data as BufferSource
  );
  return new Uint8Array(plain);
}

export const sealJson = (key: CryptoKey, slot: string, value: unknown) =>
  seal(key, slot, encoder.encode(JSON.stringify(value)));

export async function openJson<T>(key: CryptoKey, slot: string, sealed: Sealed): Promise<T> {
  return JSON.parse(decoder.decode(await open(key, slot, sealed))) as T;
}
