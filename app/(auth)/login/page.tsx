'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { FileText } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <Card className="w-full max-w-md" variant="elevated">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <FileText className="h-16 w-16 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tender Automation Platform
          </h1>
          <p className="text-gray-600">
            Sign in to access your dashboard
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            Sign In
          </Button>
        </form>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Demo accounts</strong> (password <code>password</code> in development):
          </p>
          <ul className="text-xs text-gray-700 space-y-1">
            {DEMO_EMAILS.map(demoEmail => (
              <li key={demoEmail}>
                <button type="button" className="underline" onClick={() => setEmail(demoEmail)}>
                  {demoEmail}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
