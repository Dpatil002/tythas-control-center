'use client';

import React, { useState, useEffect } from 'react';
import {
  Code,
  ShieldAlert,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Layers,
  FileText,
  BookOpen,
  Power,
  Edit2,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface PageOption {
  id: string;
  title: string;
  slug: string;
}

interface CustomScriptItem {
  id: string;
  name: string;
  scope: 'SITE' | 'PAGE' | 'BLOG';
  pageId: string | null;
  page?: { id: string; title: string; slug: string } | null;
  placement: 'HEAD' | 'BODY' | 'FOOTER';
  code: string;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  createdBy: string | null;
}

interface CustomScriptsTabProps {
  websiteId: string;
  websiteDomain: string;
}

export const CustomScriptsTab: React.FC<CustomScriptsTabProps> = ({
  websiteId,
  websiteDomain,
}) => {
  const [scripts, setScripts] = useState<CustomScriptItem[]>([]);
  const [pages, setPages] = useState<PageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Script Modal state (Add / Edit)
  const [showModal, setShowModal] = useState(false);
  const [editingScript, setEditingScript] = useState<CustomScriptItem | null>(null);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'SITE' | 'PAGE' | 'BLOG'>('SITE');
  const [pageId, setPageId] = useState<string>('');
  const [placement, setPlacement] = useState<'HEAD' | 'BODY' | 'FOOTER'>('HEAD');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'DISABLED'>('ACTIVE');
  const [trustAcknowledged, setTrustAcknowledged] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // View Script Code Modal
  const [viewingScript, setViewingScript] = useState<CustomScriptItem | null>(null);

  // Delete Confirm Dialog
  const [deletingScriptId, setDeletingScriptId] = useState<string | null>(null);

  const fetchScripts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/websites/${websiteId}/custom-scripts`);
      if (res.ok) {
        const data = await res.json();
        setScripts(data.scripts || []);
        setPages(data.pages || []);
      }
    } catch (err) {
      console.error('Failed to load custom scripts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, [websiteId]);

  const openAddModal = () => {
    setEditingScript(null);
    setName('');
    setScope('SITE');
    setPageId(pages[0]?.id || '');
    setPlacement('HEAD');
    setCode('');
    setStatus('ACTIVE');
    setTrustAcknowledged(false);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (script: CustomScriptItem) => {
    setEditingScript(script);
    setName(script.name);
    setScope(script.scope);
    setPageId(script.pageId || pages[0]?.id || '');
    setPlacement(script.placement);
    setCode(script.code);
    setStatus(script.status);
    setTrustAcknowledged(true); // Pre-acknowledged on edit
    setFormError(null);
    setShowModal(true);
  };

  const handleToggleStatus = async (scriptId: string, current: 'ACTIVE' | 'DISABLED') => {
    const next = current === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setScripts((prev) =>
      prev.map((s) => (s.id === scriptId ? { ...s, status: next } : s))
    );

    try {
      await fetch(`/api/websites/${websiteId}/custom-scripts/${scriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
    } catch {
      fetchScripts();
    }
  };

  const handleSaveScript = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Script name is required.');
      return;
    }
    if (!code.trim()) {
      setFormError('Script code is required.');
      return;
    }
    if (scope === 'PAGE' && !pageId) {
      setFormError('Please select a target page for page-scoped scripts.');
      return;
    }
    if (!trustAcknowledged) {
      setFormError('You must acknowledge the trust and safety notice to proceed.');
      return;
    }

    try {
      setActionLoading('save_script');
      const payload = {
        name: name.trim(),
        scope,
        pageId: scope === 'PAGE' ? pageId : null,
        placement,
        code,
        status,
      };

      const url = editingScript
        ? `/api/websites/${websiteId}/custom-scripts/${editingScript.id}`
        : `/api/websites/${websiteId}/custom-scripts`;
      const method = editingScript ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        fetchScripts();
      } else {
        setFormError(data.error || 'Failed to save custom script');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteScript = async () => {
    if (!deletingScriptId) return;
    try {
      setActionLoading('delete_script');
      const res = await fetch(
        `/api/websites/${websiteId}/custom-scripts/${deletingScriptId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setDeletingScriptId(null);
        fetchScripts();
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
      {/* Persistent Non-Dismissible Trust Warning Banner (Spec §50) */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3.5 shadow-sm">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-display font-semibold text-xs text-amber-900 dark:text-amber-300 uppercase tracking-wider">
            Important Trust & Safety Notice
          </h4>
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
            Only add code from trusted sources. Incorrect scripts may affect website performance or functionality.
          </p>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-semibold text-text-primary text-base">
              Custom Scripts & Tracking Pixels
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Inject custom HTML, verification tags, and third-party scripts into the Head, Body, or Footer of <span className="font-mono font-medium text-text-primary">{websiteDomain}</span>.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={openAddModal}
            className="flex-shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Custom Script
          </Button>
        </div>
      </div>

      {/* Scripts Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-border bg-surface-2/40 flex items-center justify-between">
          <div className="text-xs font-semibold text-text-primary font-display uppercase tracking-wider">
            Configured Scripts ({scripts.length})
          </div>
          <span className="text-[11px] text-text-tertiary">
            Active scripts are automatically synced to the website connector.
          </span>
        </div>

        <div className="divide-y divide-border">
          {scripts.map((script) => {
            const isActive = script.status === 'ACTIVE';

            return (
              <div
                key={script.id}
                className="p-4 sm:px-6 hover:bg-surface-2/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Script info */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isActive
                        ? 'bg-accent/10 text-accent border border-accent/20'
                        : 'bg-surface-2 text-text-secondary border border-border opacity-60'
                    }`}
                  >
                    <Code className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-semibold text-sm text-text-primary truncate">
                        {script.name}
                      </span>
                      <Badge
                        variant={isActive ? 'success' : 'neutral'}
                        className="text-[10px] font-mono"
                      >
                        {script.status}
                      </Badge>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-surface-2 border border-border text-text-secondary">
                        {script.placement}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-text-tertiary flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-text-secondary">
                        {script.scope === 'SITE' && (
                          <>
                            <Layers className="w-3.5 h-3.5 text-text-tertiary" />
                            Entire Website (Sitewide)
                          </>
                        )}
                        {script.scope === 'BLOG' && (
                          <>
                            <BookOpen className="w-3.5 h-3.5 text-text-tertiary" />
                            Blog Posts Only
                          </>
                        )}
                        {script.scope === 'PAGE' && (
                          <>
                            <FileText className="w-3.5 h-3.5 text-text-tertiary" />
                            Page:{' '}
                            <span className="font-mono text-accent">
                              /{script.page?.slug || 'page'}
                            </span>
                          </>
                        )}
                      </span>
                      <span>•</span>
                      <span>Added {new Date(script.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 self-end md:self-center">
                  {/* Status toggle button */}
                  <Button
                    size="sm"
                    variant={isActive ? 'outline' : 'primary'}
                    className="text-xs h-8"
                    onClick={() => handleToggleStatus(script.id, script.status)}
                  >
                    <Power className="w-3.5 h-3.5 mr-1" />
                    {isActive ? 'Disable' : 'Enable'}
                  </Button>

                  {/* View Code */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-8"
                    onClick={() => setViewingScript(script)}
                    title="View Code Snippet"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Code
                  </Button>

                  {/* Edit */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => openEditModal(script)}
                    title="Edit script"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>

                  {/* Delete */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-critical hover:bg-critical/10 h-8 px-2"
                    onClick={() => setDeletingScriptId(script.id)}
                    title="Delete script"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}

          {scripts.length === 0 && (
            <div className="p-8 text-center text-xs text-text-secondary">
              No custom scripts created yet. Click &quot;Add Custom Script&quot; to inject verification tags or third-party pixels.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Script Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingScript ? 'Edit Custom Script' : 'Add Custom Script'}
        description="Configure script placement, scoping, and code payload."
      >
        <form onSubmit={handleSaveScript} className="space-y-4 py-2">
          {/* Trust notice inside modal */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Warning:</strong> Only add code from trusted sources. Incorrect scripts may affect website performance or functionality.
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">
              Script Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Google Site Verification / Pinterest Pixel"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-primary">
                Scope (Where to inject)
              </label>
              <Select
                value={scope}
                onChange={(e) => setScope(e.target.value as any)}
              >
                <option value="SITE">Entire Website (Sitewide)</option>
                <option value="PAGE">Specific Page</option>
                <option value="BLOG">Blog Posts Only</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-primary">
                Placement Location
              </label>
              <Select
                value={placement}
                onChange={(e) => setPlacement(e.target.value as any)}
              >
                <option value="HEAD">&lt;head&gt; Section</option>
                <option value="BODY">&lt;body&gt; Start (Top)</option>
                <option value="FOOTER">Footer (Before &lt;/body&gt;)</option>
              </Select>
            </div>
          </div>

          {scope === 'PAGE' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-primary">
                Target Page
              </label>
              <Select
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (/{p.slug})
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">
              Script Code (HTML / JavaScript)
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={5}
              placeholder="<script>&#10;  // Your JavaScript / Tracking Pixel code here&#10;</script>"
              className="w-full font-mono text-xs p-3 rounded-lg border border-border bg-sidebar-bg text-sidebar-text focus:outline-none focus:ring-1 focus:ring-accent"
              required
            />
          </div>

          {/* Trust Acknowledgement Checkbox */}
          <div className="p-3 rounded-lg bg-surface-2 border border-border">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={trustAcknowledged}
                onChange={(e) => setTrustAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-xs text-text-secondary leading-snug">
                I understand this code will be injected directly into the live website and verify that it comes from a verified, trusted provider.
              </span>
            </label>
          </div>

          {formError && (
            <div className="text-critical text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {formError}
            </div>
          )}

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={actionLoading === 'save_script'}
              disabled={!trustAcknowledged}
            >
              {editingScript ? 'Update Script' : 'Save & Inject Script'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Code Snippet Modal */}
      <Modal
        isOpen={!!viewingScript}
        onClose={() => setViewingScript(null)}
        title={viewingScript?.name || 'Script Code'}
        description={`Placement: ${viewingScript?.placement} • Scope: ${viewingScript?.scope}`}
      >
        <div className="space-y-4 py-2">
          <pre className="p-4 bg-sidebar-bg text-sidebar-text rounded-xl font-mono text-xs overflow-x-auto max-h-72 border border-sidebar-border select-all leading-relaxed">
            {viewingScript?.code}
          </pre>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewingScript(null)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingScriptId}
        onClose={() => setDeletingScriptId(null)}
        onConfirm={handleDeleteScript}
        title="Delete Custom Script?"
        description="Deleting this script will immediately remove it from all live website pages upon connector synchronization. Are you sure?"
        confirmText="Delete Script"
        isDestructive={true}
        isLoading={actionLoading === 'delete_script'}
      />
    </div>
  );
};
