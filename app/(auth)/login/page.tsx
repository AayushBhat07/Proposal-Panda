'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Button from '@/components/ui/Button';
import { DEMO_EMAILS } from '@/lib/auth/users';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('writer@proposalpanda.dev');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
      const next = searchParams.get('next');
      // Only follow same-site relative paths.
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
  };
  
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className="font-serif text-xl font-semibold text-ink">ProposalPanda</span>
          <h1 className="font-serif text-4xl leading-tight text-ink">Sign in to the tender register</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 border border-rule-strong bg-sheet p-6 sm:p-8">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm text-ink-soft">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-11 border border-rule-strong bg-paper px-3 text-ink"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-ink-soft">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-11 border border-rule-strong bg-paper px-3 text-ink"
              required
            />
          </div>

          {error && (
            <p role="alert" className="border-l-2 border-seal bg-seal-tint px-4 py-3 text-sm text-seal">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign in
          </Button>
        </form>

        <div className="text-sm text-ink-soft">
          <p className="mb-2">
            Demo accounts (password <code className="font-mono">password</code> in development):
          </p>
          <ul className="flex flex-col gap-1">
            {DEMO_EMAILS.map(demoEmail => (
              <li key={demoEmail}>
                <button
                  type="button"
                  className="font-mono text-xs text-forest underline underline-offset-2 hover:text-forest-dark"
                  onClick={() => setEmail(demoEmail)}
                >
                  {demoEmail}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
