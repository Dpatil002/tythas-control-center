'use client';

import React, { useState, useEffect } from 'react';
import { useShell } from '@/components/shell/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Users, UserPlus, Trash2, Clock, Mail, ShieldAlert, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Member {
  id: string;
  userId: string;
  email: string;
  role: 'OWNER' | 'MANAGER';
  status: 'ACTIVE' | 'SUSPENDED';
  mfaEnabled: boolean;
  joinedAt: string;
  lastLoginAt: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: 'MANAGER';
  expiresAt: string;
  createdAt: string;
}

export default function OrganizationSettingsPage() {
  const { user } = useShell();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Remove Member Confirm State
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Revoke Invitation Confirm State
  const [inviteToRevoke, setInviteToRevoke] = useState<Invitation | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Redirect if Manager tries to access
  useEffect(() => {
    if (user && user.role !== 'OWNER') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch('/api/org/members'),
        fetch('/api/org/invitations'),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.data.members || []);
      }
      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setInvitations(data.data.invitations || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    setIsInviting(true);

    try {
      const res = await fetch('/api/org/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: 'MANAGER' }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to send invitation');
      }

      setInviteSuccess(`Invitation sent to ${inviteEmail}.`);
      setInviteEmail('');
      await loadData();
      setTimeout(() => {
        setIsInviteOpen(false);
        setInviteSuccess(null);
      }, 2000);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    try {
      const res = await fetch(`/api/org/members/${memberToRemove.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMemberToRemove(null);
        await loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRevokeInvitation = async () => {
    if (!inviteToRevoke) return;
    setIsRevoking(true);
    try {
      const res = await fetch(`/api/org/invitations/${inviteToRevoke.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setInviteToRevoke(null);
        await loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRevoking(false);
    }
  };

  if (user?.role !== 'OWNER') {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-text-primary font-display">
            Organization Settings
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Manage your organization members and team invitations for {user.organizationName}.
          </p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Teammate
        </Button>
      </div>

      {/* Members Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-text-secondary" />
            <h2 className="text-sm font-semibold text-text-primary font-display">
              Team Members ({members.length})
            </h2>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>MFA</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isSelf = member.userId === user.id;
              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-text-primary">
                        {member.email} {isSelf && <span className="text-text-tertiary text-xs">(You)</span>}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.role === 'OWNER' ? 'accent' : 'neutral'} size="sm">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.mfaEnabled ? (
                      <span className="text-xs text-success font-medium flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Enabled
                      </span>
                    ) : (
                      <span className="text-xs text-text-tertiary">Disabled</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary font-mono">
                    {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isSelf && member.role !== 'OWNER' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMemberToRemove(member)}
                        className="text-critical hover:text-critical hover:bg-critical-soft/50"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pending Invitations Section */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-text-secondary" />
          <h2 className="text-sm font-semibold text-text-primary font-display">
            Pending Invitations ({invitations.length})
          </h2>
        </div>

        {invitations.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-tertiary bg-surface border border-border rounded-lg">
            No pending invitations.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invited Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.email}</TableCell>
                  <TableCell>
                    <Badge variant="neutral" size="sm">
                      {inv.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary">
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInviteToRevoke(inv)}
                      className="text-critical hover:text-critical hover:border-critical"
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Teammate"
        description="Invite a team member to Tythas Control Center as a Manager."
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          {inviteError && (
            <div className="p-3 bg-critical-soft text-critical-text text-xs rounded-md border border-critical-soft">
              {inviteError}
            </div>
          )}
          {inviteSuccess && (
            <div className="p-3 bg-success-soft text-success-text text-xs rounded-md border border-success-soft">
              {inviteSuccess}
            </div>
          )}

          <Input
            label="Teammate Email"
            type="email"
            placeholder="colleague@agency.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />

          <div className="p-3 bg-surface-2 rounded-md text-xs text-text-secondary space-y-1">
            <p className="font-semibold text-text-primary font-display">Role: Manager</p>
            <p>Managers can view and manage only the websites explicitly assigned to them.</p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsInviteOpen(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isInviting}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Remove Member Dialog */}
      <ConfirmDialog
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${memberToRemove?.email} from ${user.organizationName}? They will immediately lose access to all websites.`}
        confirmText="Remove Member"
        isDestructive
        isLoading={isRemoving}
      />

      {/* Confirm Revoke Invite Dialog */}
      <ConfirmDialog
        isOpen={!!inviteToRevoke}
        onClose={() => setInviteToRevoke(null)}
        onConfirm={handleRevokeInvitation}
        title="Revoke Invitation"
        description={`Are you sure you want to revoke the invitation sent to ${inviteToRevoke?.email}? The invitation link will immediately stop working.`}
        confirmText="Revoke"
        isDestructive
        isLoading={isRevoking}
      />
    </div>
  );
}
