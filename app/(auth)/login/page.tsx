'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [isMfaRequired, setIsMfaRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          code: isMfaRequired ? mfaCode : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Login failed. Please check your credentials.');
      }

      if (data.data?.mfaRequired) {
        setIsMfaRequired(true);
        setIsLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent text-white font-display font-bold text-xl shadow-lg mb-4">
          T
        </div>
        <h2 className="text-2xl font-bold font-display text-text-primary tracking-tight">
          Tythas Control Center
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          Sign in to manage client websites, SEO, and leads
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface py-8 px-6 shadow-sm border border-border sm:rounded-xl sm:px-10 space-y-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-critical-soft text-critical-text text-xs rounded-md border border-critical-soft">
                {error}
              </div>
            )}

            {!isMfaRequired ? (
              <>
                <Input
                  label="Email address"
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Password
                    </label>
                    <Link
                      href="/reset-password"
                      className="text-xs text-accent hover:underline font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 p-3 bg-accent-soft text-accent-soft-text rounded-md text-xs">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                  <span>Enter the 6-digit code from your authenticator app (or backup code).</span>
                </div>

                <Input
                  label="Authentication Code"
                  type="text"
                  placeholder="123456 or ABCD-1234"
                  autoFocus
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  required
                />

                <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Verify & Sign In
                </Button>

                <button
                  type="button"
                  onClick={() => setIsMfaRequired(false)}
                  className="w-full text-center text-xs text-text-tertiary hover:text-text-primary transition-colors"
                >
                  ← Back to password
                </button>
              </div>
            )}
          </form>

          <div className="pt-2 border-t border-border text-center">
            <p className="text-xs text-text-secondary">
              First time setting up your agency?{' '}
              <Link href="/signup" className="text-accent font-semibold hover:underline">
                Create Organization
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
