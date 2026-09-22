'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { TythasLogo } from '@/components/ui/tythas-logo';

export default function ResetPasswordRequestPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to request password reset');
      }

      setSubmitted(true);
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
          Reset Password
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          Enter your account email to receive a password reset link
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface py-8 px-6 shadow-sm border border-border sm:rounded-lg sm:px-10">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-success-soft text-success flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-display font-semibold text-text-primary text-base">
                Check your email
              </h3>
              <p className="text-xs text-text-secondary">
                If an account exists for <strong className="text-text-primary">{email}</strong>, we have sent instructions to reset your password.
              </p>
              <div className="pt-3 border-t border-border">
                <Link href="/login">
                  <Button variant="outline" size="sm" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-critical-soft text-critical-text text-xs rounded-md border border-critical-soft">
                  {error}
                </div>
              )}

              <Input
                label="Account Email"
                type="email"
                placeholder="name@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />

              <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                <Mail className="w-4 h-4 mr-2" />
                Send Reset Link
              </Button>

              <div className="mt-6 pt-5 border-t border-border text-center">
                <Link
                  href="/login"
                  className="text-xs text-text-secondary hover:text-text-primary flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
