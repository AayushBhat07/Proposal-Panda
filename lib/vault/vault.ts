/**
 * The document vault: GSTIN, PAN and company certificates, kept encrypted on this computer only.
 * Nothing in here is sent to the server or the model. Storage is IndexedDB in the browser; tests pass an
 * in-memory backend.
 */

import { PBKDF2_ITERATIONS, deriveKey, open, openJson, randomBytes, seal, sealJson, type Sealed } from './crypto';

export const DOCUMENT_KINDS = {
  gst: 'GST registration certificate',
  pan: 'PAN card',
  epf: 'EPF and ESI registration',
  registration: 'Contractor registration certificate',
  turnover: 'Turnover certificate (CA)',
  solvency: 'Solvency or net worth certificate',
  works: 'Work completion certificate',
  other: 'Other document',
} as const;
export type DocumentKind = keyof typeof DOCUMENT_KINDS;

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

export interface Identifiers {
  gstin: string;
  pan: string;
}

export interface VaultDocument {
  id: string;
  kind: DocumentKind;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface AccessEntry {
  at: string;
  by: string;
  action: 'unlocked' | 'uploaded' | 'opened' | 'deleted' | 'saved identifiers' | 'exported bid' | 'built bundle';
  detail?: string;
}

/** Unencrypted header: what's needed to derive the key and check the passphrase, nothing else. */
interface Header {
  version: 1;
  /** Shown on the page, so a vault erased and recreated is noticed. */
  createdAt: string;
  salt: Uint8Array;
  iterations: number;
  verifier: Sealed;
}

export interface Backend {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

const HEADER = 'header';
const VERIFIER = 'proposalpanda-vault-v1';
const LOG_LIMIT = 500;

export class WrongPassphraseError extends Error {
  constructor() {
    super('That passphrase does not open the vault.');
  }
}

/** When the vault on this computer was created, or null if there is none. */
export async function vaultCreatedAt(backend: Backend): Promise<string | null> {
  const header = await backend.get<Header>(HEADER);
  return header ? (header.createdAt ?? '') : null;
}

export async function vaultExists(backend: Backend): Promise<boolean> {
  return (await vaultCreatedAt(backend)) !== null;
}

export async function createVault(backend: Backend, passphrase: string): Promise<CryptoKey> {
  if (await vaultExists(backend)) throw new Error('A vault already exists on this computer.');
  const salt = randomBytes(16);
  const key = await deriveKey(passphrase, salt);
  const verifier = await seal(key, HEADER, new TextEncoder().encode(VERIFIER));
  await backend.put(HEADER, {
    version: 1,
    createdAt: new Date().toISOString(),
    salt,
    iterations: PBKDF2_ITERATIONS,
    verifier,
  } satisfies Header);
  return key;
}

export async function unlockVault(backend: Backend, passphrase: string): Promise<CryptoKey> {
  const header = await backend.get<Header>(HEADER);
  if (!header) throw new Error('No vault on this computer yet.');
  // A tampered count could make unlocking hang or weaken the key.
  if (!(header.iterations >= PBKDF2_ITERATIONS && header.iterations <= 5_000_000)) {
    throw new Error('The vault header is damaged.');
  }
  const key = await deriveKey(passphrase, header.salt, header.iterations);
  try {
    await open(key, HEADER, header.verifier);
  } catch {
    throw new WrongPassphraseError();
  }
  return key;
}

/** Operations on an unlocked vault. Every read of a file and every change is written to the access log. */
export function vaultSession(backend: Backend, key: CryptoKey, user: string) {
  const read = async <T>(slot: string): Promise<T | undefined> => {
    const sealed = await backend.get<Sealed>(slot);
    return sealed ? openJson<T>(key, slot, sealed) : undefined;
  };
  const write = async (slot: string, value: unknown) => backend.put(slot, await sealJson(key, slot, value));

  const log = async (action: AccessEntry['action'], detail?: string) => {
    const entries = (await read<AccessEntry[]>('log')) ?? [];
    entries.unshift({ at: new Date().toISOString(), by: user, action, detail });
    await write('log', entries.slice(0, LOG_LIMIT));
  };

  return {
    log,
    readLog: async () => (await read<AccessEntry[]>('log')) ?? [],

    identifiers: () => read<Identifiers>('identifiers'),
    async saveIdentifiers(ids: Identifiers) {
      await write('identifiers', ids);
      await log('saved identifiers');
    },

    async documents(): Promise<VaultDocument[]> {
      const slots = (await backend.keys()).filter(k => k.startsWith('doc:'));
      const docs = await Promise.all(slots.map(slot => read<VaultDocument>(slot)));
      return docs.filter((d): d is VaultDocument => !!d).sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
    },

    async addDocument(kind: DocumentKind, name: string, type: string, bytes: Uint8Array): Promise<VaultDocument> {
      if (!ALLOWED_TYPES.includes(type)) throw new Error('Only PDF, PNG and JPEG files can go in the vault.');
      if (bytes.byteLength > MAX_FILE_BYTES) throw new Error('Files over 10 MB cannot go in the vault.');
      const doc: VaultDocument = {
        id: crypto.randomUUID(),
        kind,
        name,
        type,
        size: bytes.byteLength,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user,
      };
      await backend.put(`file:${doc.id}`, await seal(key, `file:${doc.id}`, bytes));
      await write(`doc:${doc.id}`, doc);
      await log('uploaded', `${DOCUMENT_KINDS[kind]}: ${name}`);
      return doc;
    },

    /** Decrypts a file. Logged, because it puts the plain file in the page's memory. */
    async openDocument(doc: VaultDocument, reason: 'opened' | 'built bundle' = 'opened'): Promise<Uint8Array> {
      const sealed = await backend.get<Sealed>(`file:${doc.id}`);
      if (!sealed) throw new Error('This document is missing from the vault.');
      const bytes = await open(key, `file:${doc.id}`, sealed);
      if (reason === 'opened') await log('opened', doc.name);
      return bytes;
    },

    async deleteDocument(doc: VaultDocument) {
      await backend.delete(`file:${doc.id}`);
      await backend.delete(`doc:${doc.id}`);
      await log('deleted', doc.name);
    },
  };
}

export type VaultSession = ReturnType<typeof vaultSession>;

/** IndexedDB backend: one object store, structured-cloned values (Uint8Array stays binary). */
export function indexedDbBackend(dbName = 'proposalpanda-vault'): Backend {
  const STORE = 'records';
  const db = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const run = async <T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest): Promise<T> => {
    const store = (await db).transaction(STORE, mode).objectStore(STORE);
    return new Promise<T>((resolve, reject) => {
      const request = op(store);
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  };
  return {
    get: key => run('readonly', s => s.get(key)),
    put: async (key, value) => void (await run('readwrite', s => s.put(value, key))),
    delete: async key => void (await run('readwrite', s => s.delete(key))),
    keys: async () => (await run<IDBValidKey[]>('readonly', s => s.getAllKeys())).map(String),
    clear: async () => void (await run('readwrite', s => s.clear())),
  };
}

export function memoryBackend(): Backend & { raw: Map<string, unknown> } {
  const raw = new Map<string, unknown>();
  return {
    raw,
    get: async key => raw.get(key) as never,
    put: async (key, value) => void raw.set(key, value),
    delete: async key => void raw.delete(key),
    keys: async () => [...raw.keys()],
    clear: async () => raw.clear(),
  };
}
