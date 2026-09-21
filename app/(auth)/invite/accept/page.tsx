'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldAlert, CheckCircle, Copy, Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface MfaData {
  secret: string;
  encryptedSecret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
  hashedBackupCodes: string[];
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [invitationData, setInvitationData] = useState<{
    email: string;
    organizationName: string;
    role: string;
  } | null>(null);

  const [mfaData, setMfaData] = useState<MfaData | null>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setIsValid(false);
      setErrorMessage('No invitation token provided in URL.');
      return;
    }

    fetch(`/api/invitations/${token}/accept`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setIsValid(false);
          setErrorMessage(data.error.message);
        } else {
          setIsValid(true);
          setInvitationData(data.data.invitation);
          setMfaData(data.data.mfaSetup);
        }
      })
      .catch(() => {
        setIsValid(false);
        setErrorMessage('Failed to validate invitation link.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 12) {
      setFormError('Password must be at least 12 characters.');
      return;
    }
    setFormError(null);
    setStep(2);
  };

  const handleCompleteAcceptance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaData || !token) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          totpCode,
          encryptedMfaSecret: mfaData.encryptedSecret,
          hashedBackupCodes: mfaData.hashedBackupCodes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to activate account');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Invalid authenticator code');
    } finally {
      setIsSubmitting(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-text-tertiary">Validating invitation link...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
          <div className="bg-surface py-8 px-6 shadow-sm border border-border sm:rounded-lg sm:px-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-critical-soft text-critical flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold font-display text-text-primary">
              This invitation is no longer valid
            </h2>
            <p className="text-xs text-text-secondary">
              {errorMessage || 'This invitation has expired, been revoked, or already accepted.'}
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Go to Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent text-white font-display font-bold text-xl shadow-lg mb-4">
          T
        </div>
        <h2 className="text-2xl font-bold font-display text-text-primary tracking-tight">
          Join {invitationData?.organizationName}
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          Accepting invitation for <strong className="text-text-primary">{invitationData?.email}</strong>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface py-8 px-6 shadow-sm border border-border sm:rounded-lg sm:px-10">
          {formError && (
            <div className="p-3 bg-critical-soft text-critical-text text-xs rounded-md border border-critical-soft mb-4">
              {formError}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="p-3 bg-surface-2 rounded-md text-xs text-text-secondary">
                <p className="font-semibold text-text-primary">Teammate Role: Manager</p>
                <p>Choose a secure password for your account to proceed.</p>
              </div>

              <Input
                label="Choose a Password"
                type="password"
                placeholder="Minimum 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint="Must be at least 12 characters"
                required
              />

              <Button type="submit" className="w-full mt-2">
                <span>Continue to MFA Setup</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCompleteAcceptance} className="space-y-5">
              <div className="text-center space-y-3">
                <p className="text-xs text-text-secondary">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password):
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

              <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
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

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-text-tertiary">Loading invitation...</p>
          </div>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
