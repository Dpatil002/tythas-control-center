'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Search,
  Tag,
  Target,
  Share2,
  Eye,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IntegrationProvider, PROVIDER_DISPLAY_NAMES } from '@/lib/integrations/types';

interface ConnectionItem {
  id: string;
  provider: IntegrationProvider;
  status: 'NOT_CONNECTED' | 'CONNECTED' | 'ERROR';
  externalAccountId: string | null;
  externalAccountName: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
}

interface SelectableAccount {
  id: string;
  name: string;
}

interface ConnectionsTabProps {
  websiteId: string;
  websiteDomain: string;
  websiteName: string;
}

const PROVIDER_METADATA: Record<
  string,
  {
    title: string;
    description: string;
    category: string;
    icon: React.ReactNode;
    color: string;
  }
> = {
  GA4: {
    title: 'Google Analytics 4',
    description: 'Track real-time traffic, pageviews, and custom conversion events.',
    category: 'Analytics',
    icon: <Activity className="w-5 h-5" />,
    color: 'from-amber-500/10 to-orange-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  GSC: {
    title: 'Google Search Console',
    description: 'Monitor search traffic, indexation performance, and keyword rankings.',
    category: 'SEO',
    icon: <Search className="w-5 h-5" />,
    color: 'from-blue-500/10 to-indigo-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  GTM: {
    title: 'Google Tag Manager',
    description: 'Manage tracking containers and custom triggers across your website.',
    category: 'Tag Management',
    icon: <Tag className="w-5 h-5" />,
    color: 'from-cyan-500/10 to-blue-500/5 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  },
  GOOGLE_ADS: {
    title: 'Google Ads',
    description: 'Sync conversion actions and offline lead signals for ad measurement.',
    category: 'Advertising',
    icon: <Target className="w-5 h-5" />,
    color: 'from-emerald-500/10 to-teal-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  META: {
    title: 'Meta Pixel & CAPI',
    description: 'Connect Meta Pixel and server-side Conversions API for social campaigns.',
    category: 'Advertising',
    icon: <Share2 className="w-5 h-5" />,
    color: 'from-sky-500/10 to-blue-500/5 text-sky-600 dark:text-sky-400 border-sky-500/20',
  },
  MS_CLARITY: {
    title: 'Microsoft Clarity',
    description: 'Session recordings, heatmaps, and user interaction analytics.',
    category: 'User Behavior',
    icon: <Eye className="w-5 h-5" />,
    color: 'from-purple-500/10 to-pink-500/5 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
};

export const ConnectionsTab: React.FC<ConnectionsTabProps> = ({
  websiteId,
  websiteDomain,
}) => {
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Connect / OAuth state
  const [connectingProvider, setConnectingProvider] = useState<IntegrationProvider | null>(null);
  const [selectableAccounts, setSelectableAccounts] = useState<SelectableAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [tokensData, setTokensData] = useState<any>(null);
  const [showSelectModal, setShowSelectModal] = useState(false);

  // Clarity Guided Setup state
  const [showClarityModal, setShowClarityModal] = useState(false);
  const [claritySnippet, setClaritySnippet] = useState('');
  const [clarityProjectId, setClarityProjectId] = useState('');
  const [clarityCopied, setClarityCopied] = useState(false);
  const [clarityVerifyStatus, setClarityVerifyStatus] = useState<{
    loading: boolean;
    error?: string;
    success?: string;
  }>({ loading: false });

  // Disconnect Confirmation
  const [disconnectingProvider, setDisconnectingProvider] = useState<IntegrationProvider | null>(null);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/websites/${websiteId}/integrations`);
      if (res.ok) {
        const data = await res.json();
        const coreProviders: IntegrationProvider[] = [
          'GA4',
          'GSC',
          'GTM',
          'GOOGLE_ADS',
          'META',
          'MS_CLARITY',
        ];
        const filtered = (data.data?.connections || []).filter((c: ConnectionItem) =>
          coreProviders.includes(c.provider)
        );
        setConnections(filtered);
      }
    } catch (err) {
      console.error('Failed to load connections', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [websiteId]);

  const handleStartConnect = async (provider: IntegrationProvider) => {
    if (provider === 'MS_CLARITY') {
      try {
        setActionLoading('MS_CLARITY');
        const res = await fetch(`/api/websites/${websiteId}/integrations/clarity/start`, {
          method: 'POST',
        });
        if (res.ok) {
          const resJson = await res.json();
          const data = resJson.data || resJson;
          setClaritySnippet(data.snippet);
          setClarityProjectId(data.projectId);
          setShowClarityModal(true);
          setClarityVerifyStatus({ loading: false });
        }
      } finally {
        setActionLoading(null);
      }
      return;
    }

    try {
      setActionLoading(provider);
      setConnectingProvider(provider);

      // Fetch OAuth URL and signed state
      const urlRes = await fetch(`/api/websites/${websiteId}/integrations/${provider}/auth-url`);
      const urlResJson = await urlRes.json();
      const urlData = urlResJson.data || urlResJson;

      if (!urlRes.ok) {
        alert(urlResJson.error?.message || 'Could not start OAuth flow');
        return;
      }

      // Execute mock/real callback exchange to fetch selectable accounts
      const cbRes = await fetch(
        `/api/integrations/${provider}/callback?code=mock_code_${Date.now()}&state=${urlData.state}`
      );
      const cbResJson = await cbRes.json();
      const cbData = cbResJson.data || cbResJson;

      if (cbRes.ok && cbData.accounts && cbData.accounts.length > 0) {
        setSelectableAccounts(cbData.accounts);
        setSelectedAccountId(cbData.accounts[0].id);
        setTokensData(cbData.tokens);
        setShowSelectModal(true);
      } else {
        alert(cbResJson.error?.message || 'Failed to list selectable accounts for this provider.');
      }
    } catch (err: any) {
      alert(err.message || 'Error during connection handshake');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAccount = async () => {
    if (!connectingProvider || !selectedAccountId) return;
    const selectedAcc = selectableAccounts.find((a) => a.id === selectedAccountId);
    if (!selectedAcc) return;

    try {
      setActionLoading('confirming');
      const res = await fetch(`/api/websites/${websiteId}/integrations/${connectingProvider}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedAccountId: selectedAcc.id,
          selectedAccountName: selectedAcc.name,
          tokens: tokensData,
        }),
      });

      if (res.ok) {
        setShowSelectModal(false);
        setConnectingProvider(null);
        await fetchConnections();
      } else {
        const resJson = await res.json();
        alert(resJson.error?.message || 'Failed to confirm account connection');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyClarity = async () => {
    setClarityVerifyStatus({ loading: true });
    try {
      const res = await fetch(`/api/websites/${websiteId}/integrations/clarity/verify`, {
        method: 'POST',
      });
      const resJson = await res.json();
      const data = resJson.data || resJson;
      if (res.ok && data.verified) {
        setClarityVerifyStatus({ loading: false, success: data.message });
        setTimeout(() => {
          setShowClarityModal(false);
          fetchConnections();
        }, 1200);
      } else {
        setClarityVerifyStatus({
          loading: false,
          error:
            resJson.error?.message ||
            "We couldn't find the tracking tag yet — it can take a few minutes to appear after installing, or double-check it was added to every page.",
        });
      }
    } catch {
      setClarityVerifyStatus({
        loading: false,
        error: "We couldn't verify the tag due to a network error. Please try again.",
      });
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectingProvider) return;
    try {
      setActionLoading(`disconnect_${disconnectingProvider}`);
      const res = await fetch(
        `/api/websites/${websiteId}/integrations/${disconnectingProvider}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setDisconnectingProvider(null);
        await fetchConnections();
      } else {
        const resJson = await res.json();
        alert(resJson.error?.message || 'Failed to disconnect provider');
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <RefreshCw className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-semibold text-text-primary text-base">
              External Tracking & Marketing Platforms
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Connect Google, Meta, and Microsoft Clarity accounts to enable accurate traffic tracking,
              server-side conversion sync, and search visibility for <span className="font-mono font-medium text-text-primary">{websiteDomain}</span>.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchConnections}
            className="flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Status
          </Button>
        </div>
      </div>

      {/* Grid of Connections Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connections.map((conn) => {
          const meta = PROVIDER_METADATA[conn.provider] || {
            title: conn.provider,
            description: 'External platform integration',
            category: 'Platform',
            icon: <Activity className="w-5 h-5" />,
            color: 'from-accent/10 to-accent/5 text-accent border-accent/20',
          };

          const isConnected = conn.status === 'CONNECTED';
          const isError = conn.status === 'ERROR';
          const isNotConnected = conn.status === 'NOT_CONNECTED';

          return (
            <div
              key={conn.provider}
              className={`
                relative bg-surface rounded-xl border p-5 flex flex-col justify-between transition-all duration-200 shadow-sm
                ${isConnected ? 'border-border-strong ring-1 ring-border/50' : isError ? 'border-critical/40 bg-critical/[0.02]' : 'border-border'}
              `}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2.5 rounded-lg border bg-gradient-to-br ${meta.color}`}>
                      {meta.icon}
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-sm text-text-primary">
                        {meta.title}
                      </h4>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-text-tertiary">
                        {meta.category}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {isConnected && (
                    <Badge variant="success" className="flex items-center gap-1 font-mono text-[10px]">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </Badge>
                  )}
                  {isError && (
                    <Badge variant="critical" className="flex items-center gap-1 font-mono text-[10px]">
                      <AlertTriangle className="w-3 h-3" />
                      Error
                    </Badge>
                  )}
                  {isNotConnected && (
                    <Badge variant="neutral" className="text-text-tertiary font-mono text-[10px]">
                      Not connected
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-text-secondary leading-relaxed mb-4">
                  {meta.description}
                </p>

                {/* Connected Account Details / Error Box */}
                {isConnected && conn.externalAccountName && (
                  <div className="mb-4 p-2.5 rounded-lg bg-surface-2/70 border border-border text-xs space-y-1">
                    <div className="text-[11px] font-medium text-text-secondary truncate">
                      Linked Account:
                    </div>
                    <div className="font-mono text-xs font-semibold text-text-primary truncate" title={conn.externalAccountName}>
                      {conn.externalAccountName}
                    </div>
                    {conn.connectedAt && (
                      <div className="text-[10px] text-text-tertiary font-mono">
                        Connected: {new Date(conn.connectedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}

                {isError && (
                  <div className="mb-4 p-2.5 rounded-lg bg-critical/10 border border-critical/20 text-xs">
                    <div className="text-[11px] font-semibold text-critical flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Connection Error
                    </div>
                    <p className="text-critical text-[11px] mt-0.5">
                      {conn.lastError || 'Token expired or access revoked by platform. Reconnect required.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                {isNotConnected && (
                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full justify-center"
                    isLoading={actionLoading === conn.provider}
                    onClick={() => handleStartConnect(conn.provider)}
                  >
                    Connect
                  </Button>
                )}

                {isError && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full justify-center font-medium"
                    isLoading={actionLoading === conn.provider}
                    onClick={() => handleStartConnect(conn.provider)}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Reconnect
                  </Button>
                )}

                {isConnected && (
                  <div className="flex items-center justify-between w-full gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs flex-1"
                      onClick={() => handleStartConnect(conn.provider)}
                    >
                      Change Property
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-critical hover:bg-critical/10 px-2"
                      title="Disconnect integration"
                      onClick={() => setDisconnectingProvider(conn.provider)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Account Selection Modal (Connect / Reconnect Flow) */}
      <Modal
        isOpen={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        title={`Connect ${connectingProvider ? PROVIDER_DISPLAY_NAMES[connectingProvider] : 'Platform'}`}
        description="Select the property, container, or pixel you want to link to this website."
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">
              Available Accounts / Properties
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {selectableAccounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between
                      ${
                        isSelected
                          ? 'border-accent bg-accent/5 ring-1 ring-accent/40 text-text-primary'
                          : 'border-border bg-surface hover:bg-surface-2 text-text-secondary hover:text-text-primary'
                      }
                    `}
                  >
                    <div className="flex flex-col pr-2">
                      <span className="text-xs font-semibold font-display truncate">
                        {acc.name}
                      </span>
                      <span className="text-[10px] font-mono text-text-tertiary">
                        ID: {acc.id}
                      </span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSelectModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedAccountId}
              isLoading={actionLoading === 'confirming'}
              onClick={handleConfirmAccount}
            >
              Confirm Connection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Microsoft Clarity Guided Modal */}
      <Modal
        isOpen={showClarityModal}
        onClose={() => setShowClarityModal(false)}
        title="Connect Microsoft Clarity"
        description="Follow these guided steps to install and verify the Clarity analytics script on your website."
      >
        <div className="space-y-4 py-2">
          <div className="p-3 bg-surface-2 rounded-lg border border-border space-y-2 text-xs">
            <div className="font-semibold text-text-primary flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-accent" />
              Installation Steps:
            </div>
            <ol className="list-decimal list-inside text-text-secondary space-y-1 text-xs">
              <li>Copy your unique tracking snippet below.</li>
              <li>Paste it into your website&apos;s <code className="bg-surface px-1 py-0.5 rounded text-accent font-mono text-[11px]">&lt;head&gt;</code> tag (or use the Custom Scripts tab).</li>
              <li>Click &quot;Verify Installation&quot; to test your live website.</li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-primary">
                Tracking Script (Project ID: <span className="font-mono text-accent">{clarityProjectId}</span>)
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(claritySnippet);
                  setClarityCopied(true);
                  setTimeout(() => setClarityCopied(false), 2000);
                }}
              >
                {clarityCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
            <pre className="p-3 bg-sidebar-bg text-sidebar-text rounded-lg text-[11px] font-mono overflow-x-auto max-h-36 border border-sidebar-border select-all">
              {claritySnippet}
            </pre>
          </div>

          {clarityVerifyStatus.error && (
            <div className="p-3 bg-critical/10 border border-critical/20 rounded-lg text-critical text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{clarityVerifyStatus.error}</span>
            </div>
          )}

          {clarityVerifyStatus.success && (
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-success text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{clarityVerifyStatus.success}</span>
            </div>
          )}

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClarityModal(false)}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={clarityVerifyStatus.loading}
              onClick={handleVerifyClarity}
            >
              I&apos;ve installed the tag — Verify
            </Button>
          </div>
        </div>
      </Modal>

      {/* Disconnect Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!disconnectingProvider}
        onClose={() => setDisconnectingProvider(null)}
        onConfirm={handleDisconnect}
        title={`Disconnect ${disconnectingProvider ? PROVIDER_DISPLAY_NAMES[disconnectingProvider] : 'Provider'}?`}
        description={`Disconnecting ${disconnectingProvider} will stop any conversion events mapped to it from firing on your live website. Are you sure you want to proceed?`}
        confirmText="Disconnect Platform"
        isDestructive
        isLoading={!!actionLoading && actionLoading.startsWith('disconnect_')}
      />
    </div>
  );
};
