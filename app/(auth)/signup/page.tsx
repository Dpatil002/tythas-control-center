'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, CheckCircle, Copy, Check } from 'lucide-react';
import { TythasLogo } from '@/components/ui/tythas-logo';
import { safeFetch } from '@/lib/http/safe-fetch';

interface MfaSetupData {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Account credentials
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaData, setMfaData] = useState<MfaSetupData | null>(null);

  // Step 2: MFA verification
  const [totpCode, setTotpCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await safeFetch<{ mfaSetup: MfaSetupData }>('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: orgName,
          email,
          password,
        }),
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      setMfaData(result.data.mfaSetup);
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await safeFetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode }),
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid authenticator code');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'secret' | 'backup') => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedBackupCodes(true);
      setTimeout(() => setCopiedBackupCodes(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-2/80 border border-border shadow-md mb-4 p-2.5">
          <TythasLogo variant="icon" size="md" width={38} height={38} priority />
        </div>
        <h2 className="text-2xl font-bold font-display text-text-primary tracking-tight">
          {step === 1 ? 'Create Your Organization' : 'Configure Two-Factor Auth'}
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          {step === 1
            ? 'Set up your Tythas agency account'
            : 'Mandatory security setup for Owner accounts'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface py-8 px-6 shadow-sm border border-border sm:rounded-lg sm:px-10">
          {error && (
            <div className="p-3 bg-critical-soft text-critical-text text-xs rounded-md border border-critical-soft mb-4">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <Input
                label="Agency / Organization Name"
                placeholder="Tythas Digital"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />

              <Input
                label="Owner Email Address"
                type="email"
                placeholder="owner@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Minimum 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint="Must be at least 12 characters"
                required
              />

              <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                <span>Continue to MFA Setup</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>

              <div className="mt-6 pt-5 border-t border-border text-center">
                <p className="text-xs text-text-secondary">
                  Already have an account?{' '}
                  <Link href="/login" className="text-accent font-semibold hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyMfa} className="space-y-5">
              <div className="text-center space-y-3">
                <p className="text-xs text-text-secondary">
                  Scan the QR code with your authenticator app (Google Authenticator, 1Password, etc.):
                </p>
                {mfaData?.qrCodeDataUrl && (
                  <div className="inline-block p-2 bg-white rounded-lg border border-border shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mfaData.qrCodeDataUrl}
                      alt="TOTP QR Code"
                      className="w-40 h-40 mx-auto"
                    />
                  </div>
                )}
              </div>

              {/* Secret Key manual entry */}
              <div className="p-2.5 bg-surface-2 rounded-md border border-border flex items-center justify-between text-xs font-mono">
                <div className="truncate mr-2">
                  <span className="text-text-tertiary block text-[10px]">Secret Key:</span>
                  <span className="text-text-primary select-all">{mfaData?.secret}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => mfaData && copyToClipboard(mfaData.secret, 'secret')}
                >
                  {copiedSecret ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>

              {/* Backup Codes */}
              {mfaData?.backupCodes && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary uppercase">
                      One-time Backup Codes
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(mfaData.backupCodes.join('\n'), 'backup')}
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      {copiedBackupCodes ? 'Copied!' : 'Copy All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-2 bg-surface-2 rounded-md font-mono text-[11px] text-text-secondary">
                    {mfaData.backupCodes.map((code, idx) => (
                      <span key={idx} className="bg-surface px-1.5 py-0.5 rounded border border-border/50 text-center">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Input
                label="Enter 6-Digit Verification Code"
                type="text"
                placeholder="123456"
                autoFocus
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                required
              />

              <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Activate Account & Enter Dashboard
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
