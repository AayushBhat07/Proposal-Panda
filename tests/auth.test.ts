import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can, permissionForPath, ROLES } from '../lib/auth/rbac';
import { signSession, verifySession } from '../lib/auth/session';
import { findUser } from '../lib/auth/users';

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

test('Executive and ComplianceReviewer cannot upload', () => {
  assert.equal(can('Executive', 'tender.upload'), false);
  assert.equal(can('ComplianceReviewer', 'tender.upload'), false);
  assert.equal(can(null, 'tender.view'), false);
});

test('routes map to permissions', () => {
  assert.equal(permissionForPath('/api/bid/generate'), 'bid.generate');
  assert.equal(permissionForPath('/api/intelligence/run'), 'tender.upload');
  assert.equal(permissionForPath('/generate'), 'tender.create');
  assert.equal(permissionForPath('/tenders/T-1/bid'), 'bid.view');
  assert.equal(permissionForPath('/tenders/T-1/analysis'), 'tender.view');
  assert.equal(permissionForPath('/dashboard'), null);
});

test('session round-trips and rejects tampering', async () => {
  const token = await signSession({ email: 'exec@proposalpanda.dev', name: 'E', role: 'Executive' });
  assert.equal((await verifySession(token))?.role, 'Executive');

  const [payload, signature] = token.split('.');
  const forged = Buffer.from(
    JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), role: 'Admin' })
  ).toString('base64url');
  assert.equal(await verifySession(`${forged}.${signature}`), null);
  assert.equal(await verifySession('garbage'), null);
  assert.equal(await verifySession(undefined), null);
});

test('demo login checks the password', () => {
  assert.equal(findUser('writer@proposalpanda.dev', 'password')?.role, 'BidWriter');
  assert.equal(findUser('writer@proposalpanda.dev', 'wrong'), null);
  assert.equal(findUser('nobody@proposalpanda.dev', 'password'), null);
});
