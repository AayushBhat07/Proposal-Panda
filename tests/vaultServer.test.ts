import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request, params } from './helpers';
import * as entriesRoute from '../app/api/vault/entries/route';
import * as entryRoute from '../app/api/vault/entries/[key]/route';
import * as auditRoute from '../app/api/audit/route';
import { createVault, memoryBackend, unlockVault, vaultSession, type Backend } from '../lib/vault/vault';
import { decodeRecord, encodeRecord, isVaultKey } from '../lib/vault/wire';
import { moveLocalVault } from '../lib/vault/serverBackend';
import { getDb } from '../lib/db/client';
import { vaultEntries } from '../lib/db/schema';
import type { RoleName } from '../lib/auth/rbac';

/** A Backend that goes through the real route handlers, as serverBackend does through fetch. */
function routeBackend(role: RoleName): Backend {
  return {
    async get(key) {
      const response = await entryRoute.GET(await request(role, `/api/vault/entries/${key}`), params({ key }));
      if (response.status === 404) return undefined;
      return decodeRecord((await response.json()).value);
    },
    async put(key, value) {
      const response = await entryRoute.PUT(
        await request(role, `/api/vault/entries/${key}`, { method: 'PUT', body: { value: encodeRecord(value) } }),
        params({ key })
      );
      assert.equal(response.status, 200);
    },
    async delete(key) {
      await entryRoute.DELETE(await request(role, `/api/vault/entries/${key}`, { method: 'DELETE' }), params({ key }));
    },
    keys: async () => (await (await entriesRoute.GET(await request(role, '/api/vault/entries'))).json()).keys,
    async clear() {
      await entriesRoute.DELETE(await request(role, '/api/vault/entries', { method: 'DELETE' }));
    },
  };
}

test('bytes survive the trip to the server', () => {
  const value = { salt: new Uint8Array([0, 1, 255]), nested: { data: new Uint8Array(70000).fill(7) }, n: 3 };
  const back = decodeRecord<typeof value>(encodeRecord(value));
  assert.deepEqual(back.salt, value.salt);
  assert.deepEqual(back.nested.data, value.nested.data);
  assert.equal(back.n, 3);
});

test('only vault slot names are accepted', () => {
  for (const key of ['header', 'identifiers', 'log', 'doc:3f2a-b', 'file:abc_1']) assert.ok(isVaultKey(key), key);
  for (const key of ['../x', 'doc:', 'users', 'file:a/b']) assert.equal(isVaultKey(key), false, key);
});

test('a vault on the server opens from another computer, and the server holds only ciphertext', async () => {
  const writer = routeBackend('BidWriter');
  const vault = vaultSession(writer, await createVault(writer, 'correct horse battery staple'), 'writer@proposalpanda.dev');
  await vault.saveIdentifiers({ gstin: '07ABCDE1234F1Z5', pan: 'ABCDE1234F' });
  const doc = await vault.addDocument('pan', 'PAN ABCDE1234F.pdf', 'application/pdf', new TextEncoder().encode('%PDF PAN ABCDE1234F'));

  const stored = JSON.stringify(getDb().select().from(vaultEntries).all());
  for (const secret of ['07ABCDE1234F1Z5', 'ABCDE1234F', 'PAN ABCDE', 'correct horse']) {
    assert.ok(!stored.includes(secret), `${secret} must not reach the database`);
  }

  const admin = routeBackend('Admin');
  const reopened = vaultSession(admin, await unlockVault(admin, 'correct horse battery staple'), 'admin@proposalpanda.dev');
  assert.deepEqual(await reopened.identifiers(), { gstin: '07ABCDE1234F1Z5', pan: 'ABCDE1234F' });
  assert.equal(new TextDecoder().decode(await reopened.openDocument(doc)), '%PDF PAN ABCDE1234F');
});

test('Viewers and analysts cannot reach the vault; only Admin erases it', async () => {
  for (const role of ['Viewer', 'TenderAnalyst'] as const) {
    assert.equal((await entriesRoute.GET(await request(role, '/api/vault/entries'))).status, 403);
    assert.equal((await entryRoute.GET(await request(role, '/api/vault/entries/header'), params({ key: 'header' }))).status, 403);
  }
  assert.equal((await entriesRoute.DELETE(await request('BidWriter', '/api/vault/entries', { method: 'DELETE' }))).status, 403);
  const bad = await entryRoute.PUT(
    await request('BidWriter', '/api/vault/entries/users', { method: 'PUT', body: { value: 'x' } }),
    params({ key: 'users' })
  );
  assert.equal(bad.status, 400);
});

test('vault actions go to the server log, stamped by the server', async () => {
  const post = async (role: RoleName, body: unknown) => auditRoute.POST(await request(role, '/api/audit', { method: 'POST', body }));
  assert.equal((await post('BidWriter', { action: 'unlocked', by: 'someone-else@x' })).status, 201);
  assert.equal((await post('BidWriter', { action: 'deleted the log' })).status, 400);
  assert.equal((await post('Viewer', { action: 'unlocked' })).status, 403);

  const vaultLog = await (await auditRoute.GET(await request('BidWriter', '/api/audit?scope=vault'))).json();
  assert.equal(vaultLog.entries[0].userEmail, 'writer@proposalpanda.dev');
  assert.equal(vaultLog.entries[0].action, 'unlocked');
  assert.equal((await auditRoute.GET(await request('BidWriter', '/api/audit'))).status, 403);
  assert.equal((await auditRoute.GET(await request('Admin', '/api/audit'))).status, 200);
});

test('a browser vault moves to the office once, header last', async () => {
  const local = memoryBackend();
  const key = await createVault(local, 'correct horse battery staple');
  await vaultSession(local, key, 'w').saveIdentifiers({ gstin: 'G', pan: 'P' });
  const office = memoryBackend();
  const order: string[] = [];
  const watched: Backend = { ...office, put: async (k, v) => (order.push(k), office.put(k, v)) };

  assert.equal(await moveLocalVault(local, watched), 'moved');
  assert.equal(order.at(-1), 'header');
  assert.equal((await local.keys()).length, 0);
  const reopened = vaultSession(office, await unlockVault(office, 'correct horse battery staple'), 'w');
  assert.deepEqual(await reopened.identifiers(), { gstin: 'G', pan: 'P' });

  const another = memoryBackend();
  await createVault(another, 'another long passphrase');
  assert.equal(await moveLocalVault(another, office), 'kept');
  assert.ok((await another.keys()).includes('header'), 'kept vault is left alone');
  assert.equal(await moveLocalVault(memoryBackend(), office), 'none');
});
