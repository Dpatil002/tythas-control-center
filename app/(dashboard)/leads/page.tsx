'use client';

import React, { useState, useEffect } from 'react';
import { useShell } from '@/components/shell/context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Users,
  Globe,
  Search,
  Download,
  Plus,
  Trash2,
  Edit2,
  Mail,
  Phone,
  Building,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Layers,
  ChevronRight,
  Send,
  X,
  RefreshCw,
  FileText,
  Smartphone,
  Compass,
  Tag,
  Share2,
  UserCheck,
} from 'lucide-react';

interface LeadActivity {
  id: string;
  type: string;
  title: string;
  details?: string | null;
  metadata?: string | null;
  createdAt: string;
}

interface Lead {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  message?: string | null;
  status: string;
  source: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  landingPage?: string | null;
  referrer?: string | null;
  device?: string | null;
  createdAt: string;
  form?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  submission?: {
    id: string;
    rawPayload: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt: string;
  } | null;
  assignedTo?: {
    id: string;
    name?: string | null;
    email: string;
  } | null;
  activities?: LeadActivity[];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  NEW: {
    label: 'New',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: Sparkles,
  },
  CONTACTED: {
    label: 'Contacted',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: Mail,
  },
  QUALIFIED: {
    label: 'Qualified',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: UserCheck,
  },
  PROPOSAL: {
    label: 'Proposal',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    icon: FileText,
  },
  WON: {
    label: 'Won',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: CheckCircle2,
  },
  LOST: {
    label: 'Lost',
    color: 'text-text-muted',
    bg: 'bg-surface-hover',
    border: 'border-border',
    icon: XCircle,
  },
};

const PIPELINE_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];

export default function LeadsPage() {
  const { activeWebsite, setAddWebsiteOpen } = useShell();

  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    TOTAL: 0,
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    PROPOSAL: 0,
    WON: 0,
    LOST: 0,
  });

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Lead Detail Drawer
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadDetail, setLeadDetail] = useState<Lead | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // New Note State
  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Manual Add Lead Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadCompany, setNewLeadCompany] = useState('');
  const [newLeadMessage, setNewLeadMessage] = useState('');
  const [savingLead, setSavingLead] = useState(false);

  const fetchLeads = async () => {
    if (!activeWebsite) return;
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('page', page.toString());
      params.set('limit', '50');

      const res = await fetch(`/api/websites/${activeWebsite.id}/leads?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLeads(json.leads || json.data?.leads || []);
        setCounts(json.counts || json.data?.counts || {});
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadDetail = async (leadId: string) => {
    if (!activeWebsite) return;
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/leads/${leadId}`);
      if (res.ok) {
        const json = await res.json();
        setLeadDetail(json.lead || json.data?.lead || null);
      }
    } catch (err) {
      console.error('Failed to fetch lead detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLeads();
  }, [activeWebsite?.id, statusFilter, searchQuery, page]);

  useEffect(() => {
    if (selectedLeadId) {
      fetchLeadDetail(selectedLeadId);
    } else {
      setLeadDetail(null);
    }
  }, [selectedLeadId]);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    if (!activeWebsite) return;

    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await fetchLeads();
        if (selectedLeadId === leadId) {
          await fetchLeadDetail(leadId);
        }
      }
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWebsite || !selectedLeadId || !noteContent.trim()) return;
    setAddingNote(true);

    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/leads/${selectedLeadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteContent.trim() }),
      });

      if (res.ok) {
        setNoteContent('');
        await fetchLeadDetail(selectedLeadId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!activeWebsite || !confirm('Are you sure you want to delete this lead?')) return;

    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/leads/${leadId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (selectedLeadId === leadId) setSelectedLeadId(null);
        await fetchLeads();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWebsite) return;
    setSavingLead(true);

    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLeadName.trim() || undefined,
          email: newLeadEmail.trim() || undefined,
          phone: newLeadPhone.trim() || undefined,
          company: newLeadCompany.trim() || undefined,
          message: newLeadMessage.trim() || undefined,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewLeadName('');
        setNewLeadEmail('');
        setNewLeadPhone('');
        setNewLeadCompany('');
        setNewLeadMessage('');
        await fetchLeads();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLead(false);
    }
  };

  const handleExportCsv = () => {
    if (!activeWebsite) return;
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    window.location.href = `/api/websites/${activeWebsite.id}/leads/export?${params.toString()}`;
  };

  if (!activeWebsite) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <EmptyState
          icon={<Globe className="w-6 h-6" />}
          title="No website selected"
          description="Select or connect a website to view received inquiries, attribution data, and pipeline stages."
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
              Leads Inbox & Pipeline
            </h1>
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-surface-hover text-text-muted border border-border">
              Phase 5
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 font-sans">
            Unified inbox of incoming contact inquiries, raw attribution channels, and deal progression.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            onClick={() => setShowAddModal(true)}
            className="text-xs bg-accent text-white hover:bg-accent-hover flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Lead</span>
          </Button>
        </div>
      </div>

      {/* KPI Status Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: 'TOTAL', label: 'All Inquiries', count: counts.TOTAL || 0, color: 'text-text-primary' },
          { key: 'NEW', label: 'New Leads', count: counts.NEW || 0, color: 'text-blue-400' },
          { key: 'CONTACTED', label: 'Contacted', count: counts.CONTACTED || 0, color: 'text-amber-400' },
          { key: 'QUALIFIED', label: 'Qualified', count: counts.QUALIFIED || 0, color: 'text-purple-400' },
          { key: 'PROPOSAL', label: 'Proposal Sent', count: counts.PROPOSAL || 0, color: 'text-indigo-400' },
          { key: 'WON', label: 'Won / Closed', count: counts.WON || 0, color: 'text-emerald-400' },
        ].map((tile) => {
          const isSelected = statusFilter === tile.key || (tile.key === 'TOTAL' && statusFilter === 'ALL');
          return (
            <button
              key={tile.key}
              onClick={() => setStatusFilter(tile.key === 'TOTAL' ? 'ALL' : tile.key)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-accent/10 border-accent shadow-sm'
                  : 'bg-surface border-border hover:bg-surface-hover/60'
              }`}
            >
              <div className="text-[11px] font-mono text-text-muted uppercase">{tile.label}</div>
              <div className={`text-xl font-bold font-display mt-1 ${tile.color}`}>{tile.count}</div>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-border">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', ...PIPELINE_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all ${
                statusFilter === s
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              {s === 'ALL' ? 'All Leads' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search name, email, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Leads Table & Drawer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table View */}
        <div className={selectedLeadId ? 'lg:col-span-7 space-y-4' : 'lg:col-span-12 space-y-4'}>
          <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20 text-center text-text-muted space-y-3">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono">Loading leads inbox...</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="p-12 text-center text-text-muted space-y-3">
                <Users className="w-8 h-8 text-text-muted mx-auto" />
                <h3 className="font-semibold text-sm text-text-primary">No leads found</h3>
                <p className="text-xs max-w-sm mx-auto">
                  {statusFilter !== 'ALL'
                    ? `No leads currently in "${statusFilter}" status.`
                    : 'Submissions to your deployed forms will automatically populate here.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-hover/50 font-mono text-[11px] text-text-muted uppercase">
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Source / Form</th>
                      <th className="py-3 px-4">Attribution</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {leads.map((lead) => {
                      const statusDef = STATUS_CONFIG[lead.status] || STATUS_CONFIG.NEW;
                      const isSelected = selectedLeadId === lead.id;

                      return (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className={`hover:bg-surface-hover/40 transition-colors cursor-pointer ${
                            isSelected ? 'bg-accent/5' : ''
                          }`}
                        >
                          {/* Contact Info */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-text-primary font-display">
                              {lead.name || 'Anonymous Visitor'}
                            </div>
                            <div className="text-[11px] text-text-muted font-mono mt-0.5">
                              {lead.email || lead.phone || (lead.company && `Company: ${lead.company}`) || 'No direct contact info'}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${statusDef.bg} ${statusDef.color} ${statusDef.border}`}
                            >
                              {statusDef.label}
                            </span>
                          </td>

                          {/* Form Name */}
                          <td className="py-3 px-4">
                            <span className="text-xs text-text-primary font-mono font-medium">
                              {lead.form?.name || (lead.source === 'MANUAL' ? 'Manual Entry' : 'Direct API')}
                            </span>
                          </td>

                          {/* Attribution */}
                          <td className="py-3 px-4">
                            {lead.utmSource ? (
                              <span className="text-[10px] font-mono bg-surface-hover px-1.5 py-0.5 rounded border border-border text-text-muted">
                                {lead.utmSource} {lead.utmMedium ? `/ ${lead.utmMedium}` : ''}
                              </span>
                            ) : lead.referrer ? (
                              <span className="text-[10px] font-mono text-text-muted truncate max-w-[120px] block">
                                {lead.referrer.replace(/^https?:\/\//, '')}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-text-muted/60">Direct / None</span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-3 px-4 font-mono text-[11px] text-text-muted whitespace-nowrap">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedLeadId(lead.id)}
                                className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary"
                                title="Open details"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                className="p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400"
                                title="Delete lead"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Drawer: Lead Details & Activity Timeline */}
        {selectedLeadId && (
          <div className="lg:col-span-5 bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
            {loadingDetail || !leadDetail ? (
              <div className="py-20 text-center text-text-muted space-y-3">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono">Loading lead details...</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Drawer Header */}
                <div className="p-4 border-b border-border bg-surface-hover/30 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-display font-bold text-text-primary">
                      {leadDetail.name || 'Anonymous Inquiry'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-text-muted font-mono mt-0.5">
                      <span>Created {new Date(leadDetail.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedLeadId(null)}
                    className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-6 flex-1 overflow-y-auto text-xs">
                  {/* Pipeline Stepper */}
                  <div className="space-y-2">
                    <label className="font-semibold text-text-primary font-mono text-[11px] uppercase block">
                      Pipeline Stage
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {PIPELINE_STATUSES.map((statusKey) => {
                        const isCurrent = leadDetail.status === statusKey;
                        const statusDef = STATUS_CONFIG[statusKey];
                        return (
                          <button
                            key={statusKey}
                            onClick={() => handleStatusChange(leadDetail.id, statusKey)}
                            className={`px-2 py-1.5 rounded-lg text-xs font-mono font-medium text-center border transition-all ${
                              isCurrent
                                ? `${statusDef.bg} ${statusDef.color} ${statusDef.border} font-bold shadow-sm`
                                : 'bg-surface-hover/50 border-border text-text-muted hover:text-text-primary hover:bg-surface-hover'
                            }`}
                          >
                            {statusDef.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contact Info Card */}
                  <div className="p-3.5 bg-surface-hover/30 rounded-xl border border-border space-y-2 font-mono text-xs">
                    <div className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">
                      Contact Information
                    </div>
                    {leadDetail.email && (
                      <div className="flex items-center gap-2 text-text-primary">
                        <Mail className="w-3.5 h-3.5 text-accent" />
                        <a href={`mailto:${leadDetail.email}`} className="hover:underline">
                          {leadDetail.email}
                        </a>
                      </div>
                    )}
                    {leadDetail.phone && (
                      <div className="flex items-center gap-2 text-text-primary">
                        <Phone className="w-3.5 h-3.5 text-accent" />
                        <a href={`tel:${leadDetail.phone}`} className="hover:underline">
                          {leadDetail.phone}
                        </a>
                      </div>
                    )}
                    {leadDetail.company && (
                      <div className="flex items-center gap-2 text-text-primary">
                        <Building className="w-3.5 h-3.5 text-accent" />
                        <span>{leadDetail.company}</span>
                      </div>
                    )}
                    {leadDetail.message && (
                      <div className="pt-2 border-t border-border/60 text-text-primary font-sans text-xs italic">
                        &quot;{leadDetail.message}&quot;
                      </div>
                    )}
                  </div>

                  {/* Attribution Details */}
                  <div className="space-y-2">
                    <label className="font-semibold text-text-primary font-mono text-[11px] uppercase block">
                      Attribution & Origin
                    </label>
                    <div className="p-3 bg-surface-hover/30 rounded-xl border border-border grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-text-muted">Source:</span>{' '}
                        <span className="text-text-primary font-semibold">{leadDetail.utmSource || 'Direct'}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Medium:</span>{' '}
                        <span className="text-text-primary font-semibold">{leadDetail.utmMedium || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Campaign:</span>{' '}
                        <span className="text-text-primary">{leadDetail.utmCampaign || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Device:</span>{' '}
                        <span className="text-text-primary">{leadDetail.device || 'Desktop / Web'}</span>
                      </div>
                      {leadDetail.landingPage && (
                        <div className="col-span-2">
                          <span className="text-text-muted">Landing:</span>{' '}
                          <span className="text-accent truncate block">{leadDetail.landingPage}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Raw Submission Payload (if from Form) */}
                  {leadDetail.submission?.rawPayload && (
                    <div className="space-y-2">
                      <label className="font-semibold text-text-primary font-mono text-[11px] uppercase block">
                        Raw Form Submission Payload
                      </label>
                      <div className="p-3 bg-black/80 rounded-xl border border-border font-mono text-[11px] text-emerald-400 max-h-36 overflow-y-auto">
                        <pre>{JSON.stringify(JSON.parse(leadDetail.submission.rawPayload), null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  {/* Activity Timeline */}
                  <div className="space-y-3 pt-2">
                    <label className="font-semibold text-text-primary font-mono text-[11px] uppercase block">
                      Activity Timeline ({leadDetail.activities?.length || 0})
                    </label>

                    {/* Add Note Form */}
                    <form onSubmit={handleAddNote} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add internal note or call summary..."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
                      />
                      <Button
                        type="submit"
                        disabled={addingNote || !noteContent.trim()}
                        size="sm"
                        className="text-xs bg-accent text-white hover:bg-accent-hover"
                      >
                        {addingNote ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
                      </Button>
                    </form>

                    {/* Timeline List */}
                    <div className="space-y-2.5 pt-2 border-l-2 border-border ml-2 pl-4">
                      {leadDetail.activities?.map((act) => (
                        <div key={act.id} className="relative space-y-0.5">
                          <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-accent" />
                          <div className="font-semibold text-xs text-text-primary">{act.title}</div>
                          {act.details && (
                            <div className="text-[11px] text-text-muted leading-relaxed font-sans">{act.details}</div>
                          )}
                          <div className="text-[10px] font-mono text-text-muted/60">
                            {new Date(act.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: Manual Add Lead */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md my-auto max-h-[calc(100vh-2rem)] flex flex-col bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
              <h3 className="font-display font-bold text-sm text-text-primary">Add Lead Manually</h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManualLead} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary font-mono text-[11px]">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-text-primary font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary font-mono text-[11px]">Email Address</label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-text-primary font-mono focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary font-mono text-[11px]">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-text-primary font-mono focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary font-mono text-[11px]">Company / Organization</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={newLeadCompany}
                  onChange={(e) => setNewLeadCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-text-primary font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary font-mono text-[11px]">Initial Note / Message</label>
                <textarea
                  rows={3}
                  placeholder="Inquiry notes from phone call or email..."
                  value={newLeadMessage}
                  onChange={(e) => setNewLeadMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-text-primary font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={savingLead} size="sm" className="text-xs bg-accent text-white hover:bg-accent-hover">
                  {savingLead ? 'Saving...' : 'Save Lead'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
