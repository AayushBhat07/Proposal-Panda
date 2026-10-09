'use client';

/**
 * Vault state for the page. The key exists only in this store's memory: it is gone on reload, on sign-out,
 * and after 15 minutes without activity.
 */

import { create } from 'zustand';
import {
  createVault,
  indexedDbBackend,
  unlockVault,
  vaultExists,
  vaultSession,
  WrongPassphraseError,
  type Backend,
  type Identifiers,
  type VaultDocument,
  type VaultSession,
} from './vault';

export const AUTO_LOCK_MS = 15 * 60 * 1000;
export const MIN_PASSPHRASE = 12;
const MAX_ATTEMPTS = 5;
const RETRY_AFTER_MS = 30 * 1000;

interface VaultStore {
  status: 'checking' | 'none' | 'locked' | 'unlocked';
  session: VaultSession | null;
  identifiers: Identifiers | null;
  documents: VaultDocument[];
  failedAttempts: number;
  retryAt: number;
  check: () => Promise<void>;
  setUp: (passphrase: string, user: string) => Promise<void>;
  unlock: (passphrase: string, user: string) => Promise<void>;
  lock: () => void;
  erase: () => Promise<void>;
  refresh: () => Promise<void>;
}

let backend: Backend | null = null;
const store = () => (backend ??= indexedDbBackend());

let idleTimer: ReturnType<typeof setTimeout> | undefined;
const ACTIVITY = ['pointerdown', 'keydown'] as const;

export const useVaultStore = create<VaultStore>((set, get) => {
  const resetIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => get().lock(), AUTO_LOCK_MS);
  };

  const opened = async (session: VaultSession) => {
    set({ session, status: 'unlocked', failedAttempts: 0, retryAt: 0 });
    ACTIVITY.forEach(event => window.addEventListener(event, resetIdle));
    resetIdle();
    await get().refresh();
  };

  return {
    status: 'checking',
    session: null,
    identifiers: null,
    documents: [],
    failedAttempts: 0,
    retryAt: 0,

    check: async () => {
      if (get().status === 'unlocked') return;
      set({ status: (await vaultExists(store())) ? 'locked' : 'none' });
    },

    setUp: async (passphrase, user) => {
      if (passphrase.length < MIN_PASSPHRASE) throw new Error(`Use at least ${MIN_PASSPHRASE} characters.`);
      const key = await createVault(store(), passphrase);
      await opened(vaultSession(store(), key, user));
    },

    unlock: async (passphrase, user) => {
      if (Date.now() < get().retryAt) throw new Error('Too many wrong passphrases. Wait 30 seconds and try again.');
      try {
        const session = vaultSession(store(), await unlockVault(store(), passphrase), user);
        await session.log('unlocked');
        await opened(session);
      } catch (error) {
        if (error instanceof WrongPassphraseError) {
          const failedAttempts = get().failedAttempts + 1;
          set({
            failedAttempts: failedAttempts >= MAX_ATTEMPTS ? 0 : failedAttempts,
            retryAt: failedAttempts >= MAX_ATTEMPTS ? Date.now() + RETRY_AFTER_MS : 0,
          });
        }
        throw error;
      }
    },

    lock: () => {
      clearTimeout(idleTimer);
      if (typeof window !== 'undefined') ACTIVITY.forEach(event => window.removeEventListener(event, resetIdle));
      if (get().status === 'unlocked') set({ status: 'locked' });
      set({ session: null, identifiers: null, documents: [] });
    },

    erase: async () => {
      get().lock();
      await store().clear();
      set({ status: 'none' });
    },

    refresh: async () => {
      const session = get().session;
      if (!session) return;
      set({ identifiers: (await session.identifiers()) ?? null, documents: await session.documents() });
    },
  };
});
