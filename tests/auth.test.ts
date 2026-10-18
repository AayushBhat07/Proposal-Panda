import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can, permissionForPath, ROLES } from '../lib/auth/rbac';
import { signSession, verifySession } from '../lib/auth/session';
import { openDb } from '../lib/db/open';
import { seedDemoUsers } from '../lib/db/seed';
import { createUser, updateUser, verifyCredentials, findUserById, UserInputError } from '../lib/db/repos/users';
import { hashPassword, verifyPassword } from '../lib/auth/password';

test('only Admin and BidWriter can generate bids', () => {
  assert.deepEqual(
    ROLES.filter(role => can(role, 'bid.generate')),
    ['Admin', 'BidWriter']
  );
});

test('every role can view tenders and bids', () => {
  for (const role of ROLES) {
    assert.ok(can(role, 'tender.view') && can(role, 'bid.view'), role);
  }
});

test('Viewer cannot upload or generate', () => {
  assert.equal(can('Viewer', 'tender.upload'), false);
  assert.equal(can('Viewer', 'bid.generate'), false);
  assert.equal(can('TenderAnalyst', 'bid.generate'), false);
  assert.equal(can(null, 'tender.view'), false);
});

test('routes map to permissions', () => {
  assert.equal(permissionForPath('/api/bid/generate'), 'bid.generate');
  assert.equal(permissionForPath('/api/intelligence/run'), 'tender.upload');
  assert.equal(permissionForPath('/tenders/T-1/bid'), 'bid.view');
  assert.equal(permissionForPath('/tenders/T-1/analysis'), 'tender.view');
  assert.equal(permissionForPath('/dashboard'), null);
});

test('session round-trips and rejects tampering', async () => {
  const token = await signSession({ uid: 'u1', ver: 1, email: 'viewer@proposalpanda.dev', name: 'V', role: 'Viewer' });
  assert.equal((await verifySession(token))?.role, 'Viewer');

  const [payload, signature] = token.split('.');
  const forged = Buffer.from(
    JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), role: 'Admin' })
  ).toString('base64url');
  assert.equal(await verifySession(`${forged}.${signature}`), null);
  assert.equal(await verifySession('garbage'), null);
  assert.equal(await verifySession(undefined), null);
});

test('demo login checks the password', () => {
  const db = openDb(':memory:');
  seedDemoUsers(db, 'password');
  assert.equal(verifyCredentials(db, 'Writer@proposalpanda.dev ', 'password')?.role, 'BidWriter');
  assert.equal(verifyCredentials(db, 'writer@proposalpanda.dev', 'wrong'), null);
  assert.equal(verifyCredentials(db, 'nobody@proposalpanda.dev', 'password'), null);
});

test('no demo accounts without a password, and none once someone exists', () => {
  const db = openDb(':memory:');
  seedDemoUsers(db, null);
  assert.equal(verifyCredentials(db, 'admin@proposalpanda.dev', 'password'), null);
  createUser(db, { email: 'owner@firm.in', name: 'Owner', role: 'Admin', password: 'long enough pw' });
  seedDemoUsers(db, 'password');
  assert.equal(verifyCredentials(db, 'admin@proposalpanda.dev', 'password'), null);
});

test('passwords are salted scrypt hashes', () => {
  const a = hashPassword('correct horse');
  assert.notEqual(a, hashPassword('correct horse'));
  assert.ok(verifyPassword('correct horse', a));
  assert.equal(verifyPassword('wrong horse', a), false);
  assert.equal(verifyPassword('x', 'garbage'), false);
});

test('access changes bump the session version; disabled users cannot sign in', () => {
  const db = openDb(':memory:');
  seedDemoUsers(db, 'password');
  const writer = verifyCredentials(db, 'writer@proposalpanda.dev', 'password')!;
  updateUser(db, writer.id, { name: 'Bina W' });
  assert.equal(findUserById(db, writer.id)?.sessionVersion, writer.sessionVersion);
  updateUser(db, writer.id, { role: 'Viewer' });
  assert.equal(findUserById(db, writer.id)?.sessionVersion, writer.sessionVersion + 1);
  updateUser(db, writer.id, { disabled: true });
  assert.equal(verifyCredentials(db, 'writer@proposalpanda.dev', 'password'), null);
  updateUser(db, writer.id, { disabled: false, password: 'a new password' });
  assert.ok(verifyCredentials(db, 'writer@proposalpanda.dev', 'a new password'));
});

test('the last active Admin cannot be demoted or turned off', () => {
  const db = openDb(':memory:');
  seedDemoUsers(db, 'password');
  const admin = verifyCredentials(db, 'admin@proposalpanda.dev', 'password')!;
  assert.throws(() => updateUser(db, admin.id, { role: 'Viewer' }), UserInputError);
  assert.throws(() => updateUser(db, admin.id, { disabled: true }), UserInputError);
  createUser(db, { email: 'two@firm.in', name: 'Two', role: 'Admin', password: 'long enough pw' });
  assert.equal(updateUser(db, admin.id, { role: 'Viewer' }).role, 'Viewer');
});

test('new users need a valid email, role, unique address and long password', () => {
  const db = openDb(':memory:');
  const ok = { email: 'a@firm.in', name: 'A', role: 'Viewer', password: 'long enough pw' };
  createUser(db, ok);
  assert.throws(() => createUser(db, ok), /already/);
  assert.throws(() => createUser(db, { ...ok, email: 'b@firm.in', password: 'short' }), /10 characters/);
  assert.throws(() => createUser(db, { ...ok, email: 'nope' }), /email/);
  assert.throws(() => createUser(db, { ...ok, email: 'c@firm.in', role: 'Boss' }), /role/);
});

test('only Admin manages users', () => {
  assert.deepEqual(ROLES.filter(role => can(role, 'user.manage')), ['Admin']);
  assert.equal(permissionForPath('/users'), 'user.manage');
  assert.equal(permissionForPath('/api/users/abc'), 'user.manage');
});
