import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request, params, userFor, cookieFor } from './helpers';
import { NextRequest } from 'next/server';
import * as usersRoute from '../app/api/users/route';
import * as userRoute from '../app/api/users/[id]/route';
import * as meRoute from '../app/api/auth/me/route';
import { SESSION_COOKIE } from '../lib/auth/session';

test('only Admin can list and add users', async () => {
  assert.equal((await usersRoute.GET(await request('BidWriter', '/api/users'))).status, 403);
  assert.equal((await usersRoute.GET(await request(null, '/api/users'))).status, 401);
  const list = await usersRoute.GET(await request('Admin', '/api/users'));
  assert.equal(list.status, 200);
  const { users } = await list.json();
  assert.ok(users.length >= 4 && users.every((u: Record<string, unknown>) => !('passwordHash' in u)));

  const created = await usersRoute.POST(
    await request('Admin', '/api/users', {
      method: 'POST',
      body: { email: 'new@firm.in', name: 'New', role: 'Viewer', password: 'long enough pw' },
    })
  );
  assert.equal(created.status, 201);
  const bad = await usersRoute.POST(await request('Admin', '/api/users', { method: 'POST', body: { email: 'x' } }));
  assert.equal(bad.status, 400);
});

test('a role change applies on the next request, and turning someone off signs them out', async () => {
  const oldCookie = await cookieFor('TenderAnalyst');
  const analyst = userFor('TenderAnalyst');
  const asOld = () =>
    new NextRequest('http://localhost/api/auth/me', { headers: { cookie: `${SESSION_COOKIE}=${oldCookie}` } });

  assert.equal((await meRoute.GET(asOld())).status, 200);
  await userRoute.PATCH(
    await request('Admin', `/api/users/${analyst.id}`, { method: 'PATCH', body: { disabled: true } }),
    params({ id: analyst.id })
  );
  assert.equal((await meRoute.GET(asOld())).status, 401);
  await userRoute.PATCH(
    await request('Admin', `/api/users/${analyst.id}`, { method: 'PATCH', body: { disabled: false } }),
    params({ id: analyst.id })
  );
  // Still 401: the cookie was issued before the change.
  assert.equal((await meRoute.GET(asOld())).status, 401);
  assert.equal((await meRoute.GET(await request('TenderAnalyst', '/api/auth/me'))).status, 200);
});
