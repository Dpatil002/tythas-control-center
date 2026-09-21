'use client';

import React, { useState, useEffect } from 'react';
import { useShell } from '@/components/shell/context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Globe,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Key,
  Layers,
  Trash2,
  RefreshCw,
  Plus,
  ExternalLink,
} from 'lucide-react';

export default function WebsiteSettingsPage() {
  const { activeWebsite, user, refreshWebsites, setActiveWebsite, setAddWebsiteOpen } = useShell();

  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [loadingCaps, setLoadingCaps] = useState(false);

  // Connector attach form state
  const [connectorType, setConnectorType] = useState<'WORDPRESS' | 'CUSTOM'>('WORDPRESS');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [customSecret, setCustomSecret] = useState('');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Disconnect Confirmation Modal State
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const fetchCapabilities = async () => {
    if (!activeWebsite) return;
    setLoadingCaps(true);
    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/connector/capabilities`);
      if (res.ok) {
        const data = await res.json();
        setCapabilities(data.data?.capabilities || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCaps(false);
    }
  };

  useEffect(() => {
    fetchCapabilities();
  }, [activeWebsite?.id]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWebsite) return;
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    try {
      const payload: any = { connectorType };
      if (connectorType === 'WORDPRESS') {
        payload.username = wpUsername;
        payload.applicationPassword = wpAppPassword;
      } else {
        payload.sharedSecret = customSecret;
        payload.apiEndpoint = customEndpoint;
      }

      const res = await fetch(`/api/websites/${activeWebsite.id}/connector`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to connect website.');
      }

      setFormSuccess(data.data?.message || 'Connector configured successfully.');
      setWpAppPassword('');
      setCustomSecret('');
      const updatedList = await refreshWebsites();
      const updated = updatedList.find((s) => s.id === activeWebsite.id);
      if (updated) setActiveWebsite(updated);
      await fetchCapabilities();
    } catch (err: any) {
      setFormError(err.message || 'Failed to establish connector.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!activeWebsite) return;
    setIsDisconnecting(true);

    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/connector`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to disconnect');
      }

      setIsDisconnectModalOpen(false);
      const updatedList = await refreshWebsites();
      const updated = updatedList.find((s) => s.id === activeWebsite.id);
      if (updated) setActiveWebsite(updated);
      setCapabilities([]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (!activeWebsite) {
    return (
      <div className="py-12">
        <EmptyState
          icon={<Globe className="w-6 h-6" />}
          title="No verified website selected"
          description="Select or add a verified website to manage its connector credentials and integration settings."
          action={
            <Button onClick={() => setAddWebsiteOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Website
            </Button>
          }
        />
      </div>
    );
  }

  const isOwner = user?.role === 'OWNER';
  const isConnected = activeWebsite.connectionState === 'CONNECTED';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold font-display text-text-primary">
          Website Settings
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Manage connector credentials, ownership status, and integration capabilities for{' '}
          <strong className="text-text-primary">{activeWebsite.name}</strong>.
        </p>
      </div>

      {/* Website Status & Ownership Overview */}
      <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-accent" />
            <h2 className="font-display font-semibold text-sm text-text-primary">
              Domain & Ownership
            </h2>
          </div>
          <Badge variant={activeWebsite.connectionState as any} size="sm" showDot>
            {activeWebsite.connectionState.replace('_', ' ')}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-text-tertiary">Registered Domain</div>
            <div className="font-mono font-medium text-text-primary mt-0.5">
              {activeWebsite.domain}
            </div>
          </div>
          <div>
            <div className="text-text-tertiary">Active Connector</div>
            <div className="font-medium text-text-primary mt-0.5">
              {activeWebsite.connectorType}
            </div>
          </div>
          <div>
            <div className="text-text-tertiary">Ownership Status</div>
            <div className="font-medium text-success mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {activeWebsite.ownershipVerifiedAt ? 'Verified' : 'Unverified'}
            </div>
          </div>
        </div>
      </div>

      {/* Active Capabilities */}
      <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-accent" />
            <h2 className="font-display font-semibold text-sm text-text-primary">
              Connector Capabilities
            </h2>
          </div>
          <span className="text-[11px] font-mono text-text-tertiary">
            {capabilities.length} confirmed scopes
          </span>
        </div>

        {loadingCaps ? (
          <div className="py-4 text-center text-xs text-text-tertiary flex items-center justify-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
            Probing connector capabilities...
          </div>
        ) : capabilities.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {capabilities.map((cap) => (
              <span
                key={cap}
                className="px-2.5 py-1 rounded bg-surface-2 border border-border text-xs font-mono font-medium text-text-secondary flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                {cap}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-text-tertiary p-3 bg-surface-2 rounded-md border border-border">
            No active write capabilities detected. Website is operating in Audit Only mode.
          </div>
        )}
      </div>

      {/* Connector Management Section (Owner Only) */}
      {isOwner && (
        <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-accent" />
              <h2 className="font-display font-semibold text-sm text-text-primary">
                {isConnected ? 'Manage Integration' : 'Connect Website Integration'}
              </h2>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-critical-soft text-critical-text text-xs rounded-md border border-critical-soft">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-success-soft text-success-text text-xs rounded-md border border-success-soft">
              {formSuccess}
            </div>
          )}

          {isConnected ? (
            <div className="space-y-4">
              <div className="p-3 bg-success-soft text-success-text text-xs rounded-md border border-success-soft flex items-center justify-between">
                <span>
                  Website connector is active with encrypted credentials stored securely at rest.
                </span>
              </div>

              <div className="pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDisconnectModalOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Disconnect Integration
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-text-secondary uppercase tracking-wider">
                  Connector Platform
                </label>
                <Select
                  value={connectorType}
                  onChange={(e) => setConnectorType(e.target.value as any)}
                >
                  <option value="WORDPRESS">WordPress (REST API + Companion Plugin)</option>
                  <option value="CUSTOM">Tythas Custom Connector (Shared Secret)</option>
                </Select>
              </div>

              {connectorType === 'WORDPRESS' ? (
                <>
                  <Input
                    label="WordPress Administrator Username"
                    placeholder="e.g. admin"
                    value={wpUsername}
                    onChange={(e) => setWpUsername(e.target.value)}
                    required
                  />
                  <Input
                    label="WordPress Application Password"
                    type="password"
                    placeholder="xxxx xxxx xxxx xxxx"
                    value={wpAppPassword}
                    onChange={(e) => setWpAppPassword(e.target.value)}
                    hint="Generate in WordPress Users > Profile > Application Passwords"
                    required
                  />
                </>
              ) : (
                <>
                  <Input
                    label="Custom API Endpoint (Optional)"
                    placeholder={`https://${activeWebsite.domain}`}
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    hint="Leave blank to use the registered domain"
                  />
                  <Input
                    label="Shared Connector Secret"
                    type="password"
                    placeholder="Shared secret token"
                    value={customSecret}
                    onChange={(e) => setCustomSecret(e.target.value)}
                    required
                  />
                </>
              )}

              <div className="pt-2">
                <Button type="submit" isLoading={isSubmitting}>
                  Save Connector Credentials
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Safe Action Risk Confirmation Modal */}
      <Modal
        isOpen={isDisconnectModalOpen}
        onClose={() => setIsDisconnectModalOpen(false)}
        title="Disconnect Website Connector?"
        description="This action will remove the encrypted credentials and revoke write capabilities."
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-critical-soft text-critical-text text-xs rounded-lg border border-critical-soft space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              High Risk Action
            </div>
            <p>
              Disconnecting will drop <strong>{activeWebsite.name}</strong> to{' '}
              <strong>Audit Only / Disconnected</strong>. Any scheduled syncing or editing features
              will cease to function until reconnected.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button
              variant="secondary"
              onClick={() => setIsDisconnectModalOpen(false)}
              disabled={isDisconnecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              isLoading={isDisconnecting}
            >
              Confirm Disconnect
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
