'use client';

/**
 * The office vault: sealed records kept by the server, so every office computer opens the same vault with the
 * same passphrase. Records are encrypted here before they leave; the server never sees a key or plaintext.
 */

import type { AccessEntry, AccessLog, Backend } from './vault';
import { decodeRecord, encodeRecord } from './wire';

const url = (key: string) => `/api/vault/entries/${encodeURIComponent(key)}`;

async function call(input: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, { cache: 'no-store', ...init });
  if (!response.ok && response.status !== 404) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'The office server did not answer. Check it is running and try again.');
  }
  return response;
}

const json = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export function serverBackend(): Backend {
  return {
    async get<T>(key: string) {
      const response = await call(url(key));
      if (response.status === 404) return undefined;
      return decodeRecord<T>((await response.json()).value);
    },
    put: async (key, value) => void (await call(url(key), { method: 'PUT', ...json({ value: encodeRecord(value) }) })),
    delete: async key => void (await call(url(key), { method: 'DELETE' })),
    keys: async () => (await (await call('/api/vault/entries')).json()).keys,
    clear: async () => void (await call('/api/vault/entries', { method: 'DELETE' })),
  };
}

/** The vault's access log, kept by the server where nobody can edit or delete it. */
export const serverAccessLog: AccessLog = {
  add: async ({ action, detail }) => void (await call('/api/audit', { method: 'POST', ...json({ action, detail }) })),
  read: async () => {
    const { entries } = await (await call('/api/audit?scope=vault')).json();
    return entries.map((e: { at: string; userEmail: string; action: AccessEntry['action']; detail: string | null }) => ({
      at: e.at,
      by: e.userEmail,
      action: e.action,
      detail: e.detail ?? undefined,
    }));
  },
};

/**
 * A vault kept in this browser before the office vault existed. If the office has no vault yet, its sealed
 * records are copied up as they are (the same passphrase opens them) and the browser copy is erased.
 * Returns what happened, so the page can say so.
 */
export async function moveLocalVault(local: Backend, office: Backend): Promise<'none' | 'moved' | 'kept'> {
  let localKeys: string[];
  try {
    localKeys = await local.keys();
  } catch {
    return 'none'; // no IndexedDB here
  }
  if (!localKeys.includes('header')) return 'none';
  if ((await office.keys()).includes('header')) return 'kept';
  // Header last: until it lands, the office vault doesn't exist, so a half-finished copy is retried whole.
  for (const key of [...localKeys.filter(k => k !== 'header'), 'header']) {
    await office.put(key, await local.get(key));
  }
  await local.clear();
  return 'moved';
}
