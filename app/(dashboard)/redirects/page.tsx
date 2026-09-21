'use client';

import React, { useState, useEffect } from 'react';
import { useShell } from '@/components/shell/context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ArrowRightLeft,
  Globe,
  Plus,
  Search,
  Upload,
  Download,
  Trash2,
  Edit2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function RedirectsPage() {
  const { activeWebsite, setAddWebsiteOpen } = useShell();

  const [loading, setLoading] = useState(true);
  const [redirects, setRedirects] = useState<any[]>([]);
  const [stats, setStats] = useState<{ total: number; loopsCount: number; chainsCount: number }>({
    total: 0,
    loopsCount: 0,
    chainsCount: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Add / Edit Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState<any | null>(null);
  const [fromPath, setFromPath] = useState('');
  const [toPath, setToPath] = useState('');
  const [redirectType, setRedirectType] = useState('R301');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalWarning, setModalWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Chains / Loops Inspector Modal
  const [showIssuesModal, setShowIssuesModal] = useState(false);
  const [chainLoopData, setChainLoopData] = useState<{ loops: any[]; chains: any[] } | null>(null);

  // CSV Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<any | null>(null);

  const fetchRedirects = async () => {
    if (!activeWebsite) return;
    try {
      const q = searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : '';
      const res = await fetch(`/api/websites/${activeWebsite.id}/redirects${q}`);
      if (res.ok) {
        const json = await res.json();
        setRedirects(json.data?.redirects || []);
        setStats(json.data?.stats || { total: 0, loopsCount: 0, chainsCount: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchRedirects();
  }, [activeWebsite?.id, searchQuery]);

  const loadChainLoopDetails = async () => {
    if (!activeWebsite) return;
    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/redirects/chains-and-loops`);
      if (res.ok) {
        const json = await res.json();
        setChainLoopData(json.data);
        setShowIssuesModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAdd = () => {
    setEditingRedirect(null);
    setFromPath('');
    setToPath('');
    setRedirectType('R301');
    setModalError(null);
    setModalWarning(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (r: any) => {
    setEditingRedirect(r);
    setFromPath(r.fromPath);
    setToPath(r.toPath);
    setRedirectType(r.type);
    setModalError(null);
    setModalWarning(null);
    setShowAddModal(true);
  };

  const handleSaveRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWebsite) return;
    setSaving(true);
    setModalError(null);
    setModalWarning(null);

    const endpoint = editingRedirect
      ? `/api/websites/${activeWebsite.id}/redirects/${editingRedirect.id}`
      : `/api/websites/${activeWebsite.id}/redirects`;
    const method = editingRedirect ? 'PATCH' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPath,
          toPath,
          type: redirectType
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to save redirect');
      }

      if (json.data?.warning) {
        setModalWarning(json.data.warning);
        setTimeout(() => {
          setShowAddModal(false);
          fetchRedirects();
        }, 1500);
      } else {
        setShowAddModal(false);
        fetchRedirects();
      }
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeWebsite || !confirm('Are you sure you want to delete this redirect?')) return;
    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/redirects/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchRedirects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCsv = () => {
    if (!activeWebsite) return;
    window.location.href = `/api/websites/${activeWebsite.id}/redirects/export`;
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWebsite || !csvFile) return;
    setImporting(true);
    setImportResults(null);

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/redirects/import`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to import CSV');
      }
      setImportResults(json.data);
      fetchRedirects();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  const filteredRedirects = redirects.filter((r) => {
    if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
    return true;
  });

  if (!activeWebsite) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <EmptyState
          icon={<Globe className="w-6 h-6" />}
          title="No website selected"
          description="Select or connect a website to manage redirects and path forwarding."
          actionLabel="+ Add Website"
          onAction={() => setAddWebsiteOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-text-primary tracking-tight">
              Redirects Manager
            </h1>
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-surface-hover text-text-muted border border-border">
              301 / 302 / 307 / 308
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 font-sans">
            Manage traffic routing, prevent 404 dead-ends, and detect circular redirect chains.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowImportModal(true);
              setImportResults(null);
            }}
            className="text-xs flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="text-xs bg-accent text-white hover:bg-accent-hover flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Redirect</span>
          </Button>
        </div>
      </div>

      {/* Chain & Loop Alert Banner */}
      {(stats.loopsCount > 0 || stats.chainsCount > 0) && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-amber-400">
                Redirect Issues Detected ({stats.loopsCount} loop{stats.loopsCount === 1 ? '' : 's'}, {stats.chainsCount} chain{stats.chainsCount === 1 ? '' : 's'})
              </h3>
              <p className="text-xs text-amber-400/80 mt-0.5">
                Infinite loops cause browser ERR_TOO_MANY_REDIRECTS. Chains waste crawl budget.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadChainLoopDetails}
            className="text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10 whitespace-nowrap"
          >
            Review Chains & Loops →
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-border">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {['ALL', 'R301', 'R302', 'R307', 'R308'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                typeFilter === t
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              {t === 'ALL' ? 'All Types' : t.replace(/^R/, '')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search from or to path..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Redirects Data Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-text-muted space-y-3">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono">Loading redirects...</p>
          </div>
        ) : filteredRedirects.length === 0 ? (
          <div className="p-12 text-center text-text-muted space-y-2">
            <ArrowRightLeft className="w-8 h-8 text-text-muted mx-auto" />
            <h3 className="font-semibold text-sm text-text-primary">No redirects found</h3>
            <p className="text-xs max-w-sm mx-auto">
              Create a 301 redirect or import from CSV to route legacy URLs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-hover/50 font-mono text-[11px] text-text-muted uppercase">
                  <th className="py-3 px-4">From (Source Path)</th>
                  <th className="py-3 px-2 w-8"></th>
                  <th className="py-3 px-4">To (Destination Path)</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status / Warnings</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono">
                {filteredRedirects.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-hover/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-text-primary">
                      {r.fromPath}
                    </td>
                    <td className="py-3 px-2 text-text-muted">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </td>
                    <td className="py-3 px-4 text-accent">{r.toPath}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-surface-hover border border-border text-text-muted text-[10px]">
                        {r.type.replace(/^R/, '')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {r.isLoop ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3" />
                          <span>Infinite Loop</span>
                        </span>
                      ) : r.isChain ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Multi-Hop Chain</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Redirect Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
              <h3 className="font-display font-bold text-sm text-text-primary">
                {editingRedirect ? 'Edit Redirect' : 'Add New Redirect'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRedirect} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalWarning && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalWarning}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary font-mono text-[11px]">
                  From Path (Source)
                </label>
                <input
                  type="text"
                  placeholder="/old-page"
                  value={fromPath}
                  onChange={(e) => setFromPath(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg font-mono text-text-primary focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary font-mono text-[11px]">
                  To Path (Destination)
                </label>
                <input
                  type="text"
                  placeholder="/new-page or https://..."
                  value={toPath}
                  onChange={(e) => setToPath(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg font-mono text-text-primary focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary font-mono text-[11px]">
                  Redirect HTTP Code
                </label>
                <select
                  value={redirectType}
                  onChange={(e) => setRedirectType(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg font-mono text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="R301">301 — Permanent Redirect (SEO Link Equity)</option>
                  <option value="R302">302 — Temporary Found</option>
                  <option value="R307">307 — Temporary Redirect</option>
                  <option value="R308">308 — Permanent Redirect</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  size="sm"
                  className="text-xs bg-accent text-white hover:bg-accent-hover"
                >
                  {saving ? 'Saving...' : editingRedirect ? 'Update Redirect' : 'Create Redirect'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Chains & Loops Inspection Modal */}
      {showIssuesModal && chainLoopData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border bg-surface-hover/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="font-display font-bold text-sm text-text-primary">
                  Redirect Chains & Loops Analysis
                </h3>
              </div>
              <button onClick={() => setShowIssuesModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs max-h-[70vh] overflow-y-auto">
              {/* Loops */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-400 font-semibold font-mono text-[11px] uppercase">
                  <AlertCircle className="w-4 h-4" />
                  <span>Infinite Loops ({chainLoopData.loops.length})</span>
                </div>
                {chainLoopData.loops.length === 0 ? (
                  <p className="text-text-muted text-xs">No infinite loops found.</p>
                ) : (
                  <div className="space-y-2">
                    {chainLoopData.loops.map((l, idx) => (
                      <div key={idx} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg space-y-1">
                        <div className="font-mono text-red-400 font-semibold">{l.description}</div>
                        <div className="text-[11px] text-text-muted">
                          Break this cycle by updating the destination of one of these paths.
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chains */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-semibold font-mono text-[11px] uppercase">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Multi-Hop Chains ({chainLoopData.chains.length})</span>
                </div>
                {chainLoopData.chains.length === 0 ? (
                  <p className="text-text-muted text-xs">No multi-hop chains detected.</p>
                ) : (
                  <div className="space-y-2">
                    {chainLoopData.chains.map((c, idx) => (
                      <div key={idx} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1">
                        <div className="font-mono text-amber-400 font-semibold">{c.description}</div>
                        <div className="text-[11px] text-text-muted">
                          Recommendation: Point <code className="font-mono">{c.fromPath}</code> directly to{' '}
                          <code className="font-mono">{c.finalDestination}</code> to eliminate intermediate hops.
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border bg-surface-hover/30 flex justify-end">
              <Button size="sm" onClick={() => setShowIssuesModal(false)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
              <h3 className="font-display font-bold text-sm text-text-primary">Bulk CSV Import</h3>
              <button onClick={() => setShowImportModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportCsv} className="p-6 space-y-4 text-xs">
              <p className="text-text-muted leading-relaxed">
                Upload a CSV file containing columns: <code className="font-mono text-[11px]">from_path, to_path, type</code>.
                Header row is optional.
              </p>

              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="w-full p-3 bg-surface-hover border border-dashed border-border rounded-lg text-xs file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-accent file:text-white"
                required
              />

              {importResults && (
                <div className="p-3 bg-surface-hover border border-border rounded-lg space-y-2">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-emerald-400">Imported: {importResults.importedCount}</span>
                    <span className="text-red-400">Failed: {importResults.failedCount}</span>
                  </div>
                  {importResults.failedCount > 0 && (
                    <div className="text-[11px] text-red-400 max-h-32 overflow-y-auto space-y-1 font-mono">
                      {importResults.results
                        .filter((r: any) => r.status === 'FAILED')
                        .map((f: any, idx: number) => (
                          <div key={idx}>
                            Row {f.row}: {f.fromPath} → {f.error}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImportModal(false)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  disabled={importing || !csvFile}
                  size="sm"
                  className="text-xs bg-accent text-white hover:bg-accent-hover"
                >
                  {importing ? 'Importing CSV...' : 'Process Import'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
