'use client';

/**
 * Vault state for the page. The key exists only in this store's memory: it is gone on reload, on sign-out,
 * and after 15 minutes without activity.
 */

import { create } from 'zustand';
import { useAuthStore } from '@/state/authStore';
import {
  createVault,
  indexedDbBackend,
  unlockVault,
  vaultCreatedAt,
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
  createdAt: string | null;
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
// Bumped by lock(), so an unlock still deriving its key when the vault is locked doesn't reopen it.
let generation = 0;

/** Twelve characters is not enough on its own: "aaaaaaaaaaaa" has to be refused too. */
export function passphraseProblem(passphrase: string): string | null {
  if (passphrase.length < MIN_PASSPHRASE) return `Use at least ${MIN_PASSPHRASE} characters.`;
  if (new Set(passphrase.toLowerCase()).size < 8) return 'Use more varied characters, such as four unrelated words.';
  return null;
}

/** Tells other tabs of this app to lock their vault when someone signs out. */
const LOGOUT_CHANNEL = 'proposalpanda-logout';
export function announceLogout() {
  if (typeof BroadcastChannel !== 'undefined') new BroadcastChannel(LOGOUT_CHANNEL).postMessage('logout');
}

export const useVaultStore = create<VaultStore>((set, get) => {
  const resetIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => get().lock(), AUTO_LOCK_MS);
  };

  const opened = async (session: VaultSession, started: number) => {
    if (started !== generation) return;
    set({ session, status: 'unlocked', failedAttempts: 0, retryAt: 0 });
    ACTIVITY.forEach(event => window.addEventListener(event, resetIdle));
    resetIdle();
    await get().refresh();
  };

  return {
    status: 'checking',
    createdAt: null,
    session: null,
    identifiers: null,
    documents: [],
    failedAttempts: 0,
    retryAt: 0,

    check: async () => {
      if (get().status === 'unlocked') return;
      const createdAt = await vaultCreatedAt(store());
      set({ createdAt, status: createdAt === null ? 'none' : 'locked' });
    },

    setUp: async (passphrase, user) => {
      const problem = passphraseProblem(passphrase);
      if (problem) throw new Error(problem);
      const started = generation;
      const key = await createVault(store(), passphrase);
      set({ createdAt: (await vaultCreatedAt(store())) ?? null });
      await opened(vaultSession(store(), key, user), started);
    },

    unlock: async (passphrase, user) => {
      if (Date.now() < get().retryAt) throw new Error('Too many wrong passphrases. Wait 30 seconds and try again.');
      const started = generation;
      try {
        const session = vaultSession(store(), await unlockVault(store(), passphrase), user);
        if (started !== generation) return;
        await session.log('unlocked');
        await opened(session, started);
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
      generation++;
      clearTimeout(idleTimer);
      if (typeof window !== 'undefined') ACTIVITY.forEach(event => window.removeEventListener(event, resetIdle));
      if (get().status === 'unlocked') set({ status: 'locked' });
      set({ session: null, identifiers: null, documents: [] });
    },

    erase: async () => {
      get().lock();
      await store().clear();
      set({ status: 'none', createdAt: null });
    },

    refresh: async () => {
      const session = get().session;
      if (!session) return;
      set({ identifiers: (await session.identifiers()) ?? null, documents: await session.documents() });
    },
  };
});

// The vault belongs to whoever unlocked it: lock it when the signed-in user changes or signs out, here or in
// another tab, so the next person at this computer needs the passphrase too.
if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state, previous) => {
    if (state.user?.email !== previous.user?.email) useVaultStore.getState().lock();
  });
  if (typeof BroadcastChannel !== 'undefined') {
    new BroadcastChannel(LOGOUT_CHANNEL).onmessage = () => useVaultStore.getState().lock();
  }
}
