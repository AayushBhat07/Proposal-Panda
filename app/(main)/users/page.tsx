'use client';

/**
 * Admin only: the people who can sign in, their roles, and turning accounts off.
 * A change to someone's role, password or access signs them out of their current session.
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { ROLE_LABELS, ROLES, type RoleName } from '@/lib/auth/rbac';
import { useAuthStore } from '@/state/authStore';
import type { PublicUser } from '@/lib/db/repos/users';

const inputClass = 'min-h-11 border border-rule-strong bg-paper px-3 text-ink';

async function send(url: string, method: string, body: unknown): Promise<string | null> {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (response.ok) return null;
  const data = await response.json().catch(() => ({}));
  return data.error || 'That did not save. Try again.';
}

async function fetchUsers(): Promise<PublicUser[]> {
  const response = await fetch('/api/users', { cache: 'no-store' });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()).users;
}

export default function UsersPage() {
  const me = useAuthStore(state => state.user);
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'Viewer' as RoleName, password: '' });

  const load = useCallback(
    () =>
      fetchUsers().then(
        list => setUsers(list),
        () => setError('Could not load the user list.')
      ),
    []
  );

  useEffect(() => {
    fetchUsers().then(
      list => setUsers(list),
      () => setError('Could not load the user list.')
    );
  }, []);

  const change = async (user: PublicUser, changes: Record<string, unknown>, done: string) => {
    setNotice(null);
    const failure = await send(`/api/users/${user.id}`, 'PATCH', changes);
    setError(failure);
    if (!failure) setNotice(done);
    await load();
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const failure = await send('/api/users', 'POST', form);
    setError(failure);
    if (failure) return;
    setNotice(`${form.name.trim()} can now sign in as ${ROLE_LABELS[form.role]}.`);
    setForm({ name: '', email: '', role: 'Viewer', password: '' });
    await load();
  };

  const resetPassword = (user: PublicUser) => {
    const password = window.prompt(`New password for ${user.name} (at least 10 characters)`);
    if (password) change(user, { password }, `${user.name}'s password was changed. Tell them the new one.`);
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 pt-8 pb-24 sm:px-8 lg:px-14">
      <div className="flex flex-col gap-3">
        <span className="font-mono text-xs tracking-widest text-muted">USERS</span>
        <h1 className="font-serif text-4xl leading-tight text-balance text-ink">Who can sign in</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-pretty text-ink-soft">
          Changing someone&apos;s role, password or access signs them out, so the change applies straight away.
        </p>
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-seal bg-seal-tint px-4 py-3 text-sm text-seal">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="border-l-2 border-forest bg-sheet px-4 py-3 text-sm text-ink">
          {notice}
        </p>
      )}

      <section aria-labelledby="people" className="flex flex-col gap-4">
        <h2 id="people" className="font-serif text-2xl text-ink">
          People
        </h2>
        {!users ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <ul className="flex flex-col divide-y divide-rule border border-rule-strong bg-sheet">
            {users.map(user => {
              const isMe = user.email === me?.email;
              return (
                <li key={user.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
                  <div className="flex min-w-48 flex-1 flex-col">
                    <span className={`font-medium ${user.disabledAt ? 'text-muted line-through' : 'text-ink'}`}>
                      {user.name}
                      {isMe && <span className="ml-2 text-xs font-normal text-muted">(you)</span>}
                    </span>
                    <span className="font-mono text-xs text-ink-soft">{user.email}</span>
                    {user.disabledAt && <span className="text-xs text-seal">Turned off</span>}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-ink-soft">
                    <span className="sr-only">Role for {user.name}</span>
                    <select
                      value={user.role}
                      onChange={e =>
                        change(user, { role: e.target.value }, `${user.name} is now ${ROLE_LABELS[e.target.value as RoleName]}.`)
                      }
                      className={inputClass}
                    >
                      {ROLES.map(role => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => resetPassword(user)}>
                    Reset password
                  </Button>
                  {!isMe && (
                    <Button
                      type="button"
                      variant={user.disabledAt ? 'outline' : 'ghost'}
                      size="sm"
                      onClick={() =>
                        change(
                          user,
                          { disabled: !user.disabledAt },
                          user.disabledAt ? `${user.name} can sign in again.` : `${user.name} is signed out and can't sign in.`
                        )
                      }
                    >
                      {user.disabledAt ? 'Turn on' : 'Turn off'}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form onSubmit={add} aria-labelledby="add" className="flex flex-col gap-5 border border-rule-strong bg-sheet p-6 sm:p-8">
        <h2 id="add" className="font-serif text-2xl text-ink">
          Add a person
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
            Name
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
            Role
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as RoleName })} className={inputClass}>
              {ROLES.map(role => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
            First password (at least 10 characters)
            <input
              required
              type="password"
              minLength={10}
              autoComplete="new-password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className={inputClass}
            />
          </label>
        </div>
        <div className="flex justify-end">
          <Button type="submit">Add person</Button>
        </div>
      </form>
    </div>
  );
}
