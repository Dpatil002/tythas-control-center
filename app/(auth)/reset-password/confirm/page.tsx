'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle, ShieldAlert, Lock } from 'lucide-react';
import { TythasLogo } from '@/components/ui/tythas-logo';

function ConfirmResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="min-h-screen bg-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
          <div className="bg-surface py-8 px-6 shadow-sm border border-border sm:rounded-lg sm:px-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-critical-soft text-critical flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold font-display text-text-primary">
              Invalid Reset Link
            </h2>
            <p className="text-xs text-text-secondary">
              No reset token found. Please request a new password reset link.
            </p>
            <div className="pt-2">
              <Link href="/reset-password">
                <Button variant="outline" size="sm">
                  Request New Link
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to reset password');
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-2/80 border border-border shadow-md mb-4 p-2.5">
          <TythasLogo variant="icon" size="md" width={38} height={38} priority />
        </div>
        <h2 className="text-2xl font-bold font-display text-text-primary tracking-tight">
          Set New Password
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          Enter a new secure password for your Tythas account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface py-8 px-6 shadow-sm border border-border sm:rounded-lg sm:px-10">
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-success-soft text-success flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-display font-semibold text-text-primary text-base">
                Password Reset Successfully
              </h3>
              <p className="text-xs text-text-secondary">
                Your password has been updated. Redirecting you to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {error && (
                <div className="p-3 bg-critical-soft text-critical-text text-xs rounded-md border border-critical-soft">
                  {error}
                </div>
              )}

              <Input
                label="New Password"
                type="password"
                placeholder="Minimum 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint="Must be at least 12 characters"
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                <Lock className="w-4 h-4 mr-2" />
                Reset Password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-text-tertiary">Loading reset link...</p>
          </div>
        </div>
      }
    >
      <ConfirmResetPasswordContent />
    </Suspense>
  );
}
