'use client';

import React, { useState, useEffect } from 'react';
import { useShell } from '@/components/shell/context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Shield, Laptop, Smartphone, Globe, LogOut, CheckCircle, AlertTriangle } from 'lucide-react';

interface SessionItem {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

export default function SecuritySettingsPage() {
  const { user } = useShell();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToRevoke, setSessionToRevoke] = useState<SessionItem | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data.sessions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevoke = async () => {
    if (!sessionToRevoke) return;
    setIsRevoking(true);
    try {
      const res = await fetch(`/api/auth/sessions/${sessionToRevoke.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSessionToRevoke(null);
        await loadSessions();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRevoking(false);
    }
  };

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return 'Unknown Device';
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) return 'Mac OS (Browser)';
    if (ua.includes('Windows')) return 'Windows PC (Browser)';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Device';
    if (ua.includes('Android')) return 'Android Device';
    if (ua.includes('Linux')) return 'Linux (Browser)';
    return 'Web Browser';
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-xl font-bold text-text-primary font-display">
          Profile & Security
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Manage your account credentials, two-factor authentication, and active sessions.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary font-display flex items-center gap-2">
          <Shield className="w-4 h-4 text-accent" />
          Account Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-text-tertiary block">Email Address</span>
            <span className="text-text-primary font-medium">{user?.email}</span>
          </div>
          <div>
            <span className="text-text-tertiary block">Organization</span>
            <span className="text-text-primary font-medium">
              {user?.organizationName} ({user?.role})
            </span>
          </div>
        </div>
      </div>

      {/* MFA Status Card */}
      <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-success-soft text-success flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary font-display">
                Two-Factor Authentication (TOTP)
              </h2>
              <p className="text-xs text-text-secondary">
                Protects your account with a secondary 6-digit code from your authenticator app.
              </p>
            </div>
          </div>
          <Badge variant="success">Enabled</Badge>
        </div>
      </div>

      {/* Active Sessions Card ("Remote session logout", spec §6 & §9) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-text-primary font-display flex items-center gap-2">
              <Laptop className="w-4 h-4 text-text-secondary" />
              Active Sessions ({sessions.length})
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              These devices are currently signed in to your account. You can log out from any device remotely.
            </p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device & Browser</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>First Signed In</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((sess) => (
              <TableRow key={sess.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-surface-2 flex items-center justify-center text-text-secondary">
                      {sess.userAgent?.includes('Mobile') ? (
                        <Smartphone className="w-4 h-4" />
                      ) : (
                        <Laptop className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-text-primary">
                          {parseUserAgent(sess.userAgent)}
                        </span>
                        {sess.isCurrent && (
                          <Badge variant="accent" size="sm">
                            Current Device
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-text-tertiary truncate block max-w-xs font-mono">
                        {sess.userAgent || 'Unknown agent'}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-text-secondary">
                  {sess.ip || '127.0.0.1'}
                </TableCell>
                <TableCell className="text-xs text-text-secondary">
                  {new Date(sess.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-xs text-text-secondary font-mono">
                  {new Date(sess.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </TableCell>
                <TableCell className="text-right">
                  {!sess.isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSessionToRevoke(sess)}
                      className="text-critical hover:text-critical hover:border-critical"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1" />
                      Revoke
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Confirm Session Revoke Dialog */}
      <ConfirmDialog
        isOpen={!!sessionToRevoke}
        onClose={() => setSessionToRevoke(null)}
        onConfirm={handleRevoke}
        title="Revoke Session"
        description="Are you sure you want to log out this session? The device will immediately lose access and be forced to log in again."
        confirmText="Revoke Session"
        isDestructive
        isLoading={isRevoking}
      />
    </div>
  );
}
