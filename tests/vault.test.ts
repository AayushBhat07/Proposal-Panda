import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVault, memoryBackend, unlockVault, vaultSession, WrongPassphraseError } from '../lib/vault/vault';
import { attachFromVault, mask, scrubIdentifiers, withIdentifiers } from '../lib/vault/bidVault';
import { seal } from '../lib/vault/crypto';

// Uses the real 600,000-round key derivation, so these tests also show unlocking stays fast enough.
test('a vault opens with its passphrase and not with another', async () => {
  const backend = memoryBackend();
  await createVault(backend, 'correct horse battery staple');
  await assert.rejects(createVault(backend, 'again'), /already exists/);
  await assert.rejects(unlockVault(backend, 'wrong passphrase'), WrongPassphraseError);
  await unlockVault(backend, 'correct horse battery staple');
});

test('identifiers and files are stored encrypted and logged', async () => {
  const backend = memoryBackend();
  const key = await createVault(backend, 'correct horse battery staple');
  const vault = vaultSession(backend, key, 'writer@proposalpanda.dev');
  await vault.saveIdentifiers({ gstin: '07ABCDE1234F1Z5', pan: 'ABCDE1234F' });
  const file = new TextEncoder().encode('%PDF-1.4 GST certificate 07ABCDE1234F1Z5');
  const doc = await vault.addDocument('gst', 'gst.pdf', 'application/pdf', file);

  const stored = JSON.stringify([...backend.raw.values()], (_, v) => (v instanceof Uint8Array ? Buffer.from(v).toString('latin1') : v));
  for (const secret of ['07ABCDE1234F1Z5', 'ABCDE1234F', 'gst.pdf', 'GST certificate']) {
    assert.ok(!stored.includes(secret), `${secret} must not be stored in the clear`);
  }

  const reopened = vaultSession(backend, await unlockVault(backend, 'correct horse battery staple'), 'admin@proposalpanda.dev');
  assert.deepEqual(await reopened.identifiers(), { gstin: '07ABCDE1234F1Z5', pan: 'ABCDE1234F' });
  assert.deepEqual((await reopened.documents()).map(d => d.name), ['gst.pdf']);
  assert.deepEqual(await reopened.openDocument(doc), file);
  await reopened.deleteDocument(doc);
  assert.equal((await reopened.documents()).length, 0);
  assert.deepEqual((await reopened.readLog()).map(e => `${e.by} ${e.action}`), [
    'admin@proposalpanda.dev deleted',
    'admin@proposalpanda.dev opened',
    'writer@proposalpanda.dev uploaded',
    'writer@proposalpanda.dev saved identifiers',
  ]);
});

test('a record moved to another slot or altered does not open', async () => {
  const backend = memoryBackend();
  const key = await createVault(backend, 'correct horse battery staple');
  const vault = vaultSession(backend, key, 'w');
  await vault.saveIdentifiers({ gstin: 'G', pan: 'P' });
  backend.raw.set('doc:x', backend.raw.get('identifiers'));
  await assert.rejects(vault.documents());
  backend.raw.delete('doc:x');
  const sealed = await seal(key, 'identifiers', new TextEncoder().encode('{}'));
  sealed.data[0] ^= 1;
  backend.raw.set('identifiers', sealed);
  await assert.rejects(vault.identifiers());
});

test('the vault refuses other file types and large files', async () => {
  const backend = memoryBackend();
  const vault = vaultSession(backend, await createVault(backend, 'correct horse battery staple'), 'w');
  await assert.rejects(vault.addDocument('other', 'a.exe', 'application/x-msdownload', new Uint8Array(1)), /Only PDF/);
  await assert.rejects(vault.addDocument('other', 'big.pdf', 'application/pdf', new Uint8Array(11 * 1024 * 1024)), /10 MB/);
});

test('bid text shows identifiers masked, revealed only on request, and placeholders when locked', () => {
  const text = 'GSTIN {GSTIN}, PAN {PAN}';
  const ids = { gstin: '07ABCDE1234F1Z5', pan: 'ABCDE1234F' };
  assert.equal(mask('ABCDE1234F'), 'AB••••••4F');
  assert.equal(withIdentifiers(text, ids, false), 'GSTIN 07•••••••••••Z5, PAN AB••••••4F');
  assert.equal(withIdentifiers(text, ids, true), 'GSTIN 07ABCDE1234F1Z5, PAN ABCDE1234F');
  assert.equal(withIdentifiers(text, null, true), 'GSTIN GSTIN (in vault), PAN PAN (in vault)');
});

test('checklist lines are marked attached only for documents the vault holds', () => {
  const content = '3. GST registration certificate (GSTIN {GSTIN}) [attach]\n4. PAN card ({PAN}) [attach]\n5. EPF and ESI registration [attach]';
  const docs = [{ id: '1', kind: 'gst' as const, name: 'gst.pdf', type: 'application/pdf', size: 1, uploadedAt: '', uploadedBy: '' }];
  assert.equal(
    attachFromVault(content, docs),
    '3. GST registration certificate (GSTIN {GSTIN}) (attached from vault: GST registration certificate)\n4. PAN card ({PAN}) [attach]\n5. EPF and ESI registration [attach]'
  );
});

test('old bids lose their real GSTIN and PAN', () => {
  assert.equal(
    scrubIdentifiers('GSTIN 07ABCDE1234F1Z5, PAN ABCDE1234F', { gstin: '07ABCDE1234F1Z5', panNumber: 'ABCDE1234F' }),
    'GSTIN {GSTIN}, PAN {PAN}'
  );
});

test('a tampered iteration count is refused', async () => {
  const backend = memoryBackend();
  await createVault(backend, 'correct horse battery staple');
  const header = backend.raw.get('header') as { iterations: number };
  backend.raw.set('header', { ...header, iterations: 1e9 });
  await assert.rejects(unlockVault(backend, 'correct horse battery staple'), /damaged/);
});
