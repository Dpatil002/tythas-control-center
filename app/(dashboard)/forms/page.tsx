'use client';

import React, { useState, useEffect } from 'react';
import { useShell } from '@/components/shell/context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  CheckSquare,
  Globe,
  Plus,
  Search,
  Trash2,
  Edit2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Code,
  Copy,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Send,
  UserPlus,
  Mail,
  Zap,
  ArrowRight,
  MessageSquare,
  Webhook,
  FileText,
  Settings2,
  Eye,
  Check,
  Radio,
  ListFilter,
} from 'lucide-react';

interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  placeholder?: string | null;
  required: boolean;
  options?: string | null;
  validationRules?: string | null;
  order: number;
}

interface FormAction {
  id: string;
  type: string;
  enabled: boolean;
  config: string;
  order: number;
}

interface FormItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  publicKey: string;
  websiteId: string;
  createdAt: string;
  updatedAt: string;
  fields: FormField[];
  actions: FormAction[];
  _count?: {
    submissions: number;
  };
}

const FIELD_TYPES = [
  { type: 'TEXT', label: 'Single Line Text', icon: '📝' },
  { type: 'EMAIL', label: 'Email Address', icon: '✉️' },
  { type: 'PHONE', label: 'Phone Number', icon: '📞' },
  { type: 'NUMBER', label: 'Number', icon: '🔢' },
  { type: 'DROPDOWN', label: 'Dropdown Select', icon: '▾' },
  { type: 'CHECKBOX', label: 'Checkbox', icon: '☑️' },
  { type: 'RADIO', label: 'Radio Buttons', icon: '🔘' },
  { type: 'DATE', label: 'Date Picker', icon: '📅' },
  { type: 'FILE', label: 'File Upload', icon: '📎' },
  { type: 'HIDDEN', label: 'Hidden Field', icon: '🔒' },
];

const ACTION_TYPES = [
  {
    type: 'CREATE_LEAD',
    label: 'Create Lead',
    description: 'Automatically creates a new Lead in the Tythas Leads inbox and pipeline.',
    icon: UserPlus,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  {
    type: 'SHOW_SUCCESS_MESSAGE',
    label: 'Show Success Message',
    description: 'Displays a custom confirmation notice immediately upon submission.',
    icon: MessageSquare,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    type: 'REDIRECT',
    label: 'Redirect to URL',
    description: 'Redirects the visitor to a thank you page or custom destination.',
    icon: ArrowRight,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  {
    type: 'SEND_EMAIL',
    label: 'Send Email Notification',
    description: 'Dispatches instant email alerts with submission data to team members.',
    icon: Mail,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    type: 'TRIGGER_CONVERSION',
    label: 'Trigger Conversion Event',
    description: 'Fires analytics conversion events (GA4, Meta Pixel, custom).',
    icon: Zap,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    type: 'SEND_WEBHOOK',
    label: 'Send Webhook',
    description: 'POSTs submission payload to Zapier, Make, CRM, or custom endpoints.',
    icon: Webhook,
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  },
];

// Temporarily hidden per request: the "Create New Form" entry points are hidden from the UI
// while keeping all the underlying code (modal, handler, API route) intact so this can be
// switched back on later just by flipping this flag.
const SHOW_CREATE_FORM_BUTTON = false;

export default function FormsPage() {
  const { activeWebsite, setAddWebsiteOpen } = useShell();

  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<FormItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [creating, setCreating] = useState(false);

  // Form Builder State
  const [selectedForm, setSelectedForm] = useState<FormItem | null>(null);
  const [activeTab, setActiveTab] = useState<'fields' | 'actions' | 'preview'>('fields');
  const [savingForm, setSavingForm] = useState(false);

  // Field Add/Edit Modal
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldType, setNewFieldType] = useState('TEXT');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // Disable Lead Warning Modal
  const [showDisableLeadModal, setShowDisableLeadModal] = useState(false);
  const [pendingActionToggle, setPendingActionToggle] = useState<FormAction | null>(null);

  // Deploy / Embed Dialog
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployingForm, setDeployingForm] = useState<FormItem | null>(null);
  const [deployResult, setDeployResult] = useState<any | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const fetchForms = async () => {
    if (!activeWebsite) return;
    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/forms`);
      if (res.ok) {
        const json = await res.json();
        const formsList = json.forms || json.data?.forms || [];
        setForms(formsList);
        if (selectedForm) {
          const updated = formsList.find((f: FormItem) => f.id === selectedForm.id);
          if (updated) setSelectedForm(updated);
        }
      }
    } catch (err) {
      console.error('Failed to fetch forms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchForms();
  }, [activeWebsite?.id]);

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWebsite || !newFormName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/forms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFormName.trim() }),
      });

      if (res.ok) {
        const json = await res.json();
        setShowCreateModal(false);
        setNewFormName('');
        await fetchForms();
        const createdForm = json.form || json.data?.form;
        if (createdForm) {
          setSelectedForm(createdForm);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!activeWebsite || !confirm('Are you sure you want to delete this form and all its fields/actions?')) return;

    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/forms/${formId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (selectedForm?.id === formId) setSelectedForm(null);
        fetchForms();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWebsite || !selectedForm || !newFieldLabel.trim()) return;

    const autoName = newFieldName.trim() || newFieldLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const optionsArray = ['DROPDOWN', 'RADIO', 'CHECKBOX'].includes(newFieldType)
      ? newFieldOptions.split('\n').map((s) => s.trim()).filter(Boolean)
      : [];

    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/forms/${selectedForm.id}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newFieldType,
          label: newFieldLabel.trim(),
          name: autoName,
          placeholder: newFieldPlaceholder.trim() || undefined,
          required: newFieldRequired,
          options: optionsArray,
        }),
      });

      if (res.ok) {
        setShowAddFieldModal(false);
        setNewFieldLabel('');
        setNewFieldName('');
        setNewFieldPlaceholder('');
        setNewFieldRequired(false);
        setNewFieldOptions('');
        await fetchForms();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!activeWebsite || !selectedForm) return;

    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/forms/${selectedForm.id}/fields/${fieldId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchForms();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveField = async (fieldIndex: number, direction: 'up' | 'down') => {
    if (!activeWebsite || !selectedForm) return;
    const fields = [...selectedForm.fields].sort((a, b) => a.order - b.order);
    const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const temp = fields[fieldIndex];
    fields[fieldIndex] = fields[targetIndex];
    fields[targetIndex] = temp;

    const reorderedItems = fields.map((f, idx) => ({ id: f.id, order: idx }));

    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/forms/${selectedForm.id}/fields/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: reorderedItems }),
      });
      if (res.ok) {
        await fetchForms();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAction = async (action: FormAction) => {
    if (!activeWebsite || !selectedForm) return;

    if (action.type === 'CREATE_LEAD' && action.enabled) {
      setPendingActionToggle(action);
      setShowDisableLeadModal(true);
      return;
    }

    await executeActionUpdate(action.id, !action.enabled, undefined);
  };

  const executeActionUpdate = async (actionId: string, enabled?: boolean, config?: any) => {
    if (!activeWebsite || !selectedForm) return;

    try {
      const res = await fetch(
        `/api/websites/${activeWebsite.id}/forms/${selectedForm.id}/actions/${actionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(enabled !== undefined && { enabled }),
            ...(config !== undefined && { config }),
          }),
        }
      );
      if (res.ok) {
        await fetchForms();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDeploy = (form: FormItem) => {
    setDeployingForm(form);
    setDeployResult(null);
    setCopiedSnippet(false);
    setShowDeployModal(true);
  };

  const handleExecuteDeploy = async () => {
    if (!activeWebsite || !deployingForm) return;
    setSavingForm(true);

    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/forms/${deployingForm.id}/deploy`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok) {
        setDeployResult(json);
        await fetchForms();
      } else {
        alert(json.error || 'Failed to deploy form');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingForm(false);
    }
  };

  const getEmbedCode = (form: FormItem) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.tythas.com';
    return `<!-- Tythas Form Embed: ${form.name} -->
<form action="${origin}/api/public/forms/${form.publicKey}/submissions" method="POST" class="tythas-form" data-form-id="${form.id}">
  <input type="hidden" name="_hp_company" style="display:none !important;" tabindex="-1" autocomplete="off" />
${form.fields
  .sort((a, b) => a.order - b.order)
  .map((f) => {
    if (f.type === 'DROPDOWN') {
      let opts: string[] = [];
      try {
        opts = JSON.parse(f.options || '[]');
      } catch {
        opts = [];
      }
      return `  <div class="tythas-field">
    <label for="${f.name}">${f.label}${f.required ? ' *' : ''}</label>
    <select name="${f.name}" id="${f.name}" ${f.required ? 'required' : ''}>
      <option value="">Select an option</option>
      ${opts.map((o) => `<option value="${o}">${o}</option>`).join('\n      ')}
    </select>
  </div>`;
    }
    return `  <div class="tythas-field">
    <label for="${f.name}">${f.label}${f.required ? ' *' : ''}</label>
    <input type="${f.type.toLowerCase() === 'number' ? 'number' : f.type.toLowerCase() === 'email' ? 'email' : f.type.toLowerCase() === 'phone' ? 'tel' : 'text'}" name="${f.name}" id="${f.name}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''} />
  </div>`;
  })
  .join('\n')}
  <button type="submit" class="tythas-submit-btn">Submit</button>
</form>`;
  };

  const filteredForms = forms.filter((f) => {
    if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
    if (searchQuery.trim() && !f.name.toLowerCase().includes(searchQuery.toLowerCase()) && !f.slug.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (!activeWebsite) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <EmptyState
          icon={<Globe className="w-6 h-6" />}
          title="No website selected"
          description="Select or connect a website to build forms, setup lead capture, and deploy submission pipelines."
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
              Forms Builder
            </h1>
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-surface-hover text-text-muted border border-border">
              Phase 5
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 font-sans">
            Build responsive no-code forms, route submissions into Leads, and deploy anywhere via custom connectors.
          </p>
        </div>

        {SHOW_CREATE_FORM_BUTTON && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="text-xs bg-accent text-white hover:bg-accent-hover flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Create Form</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Grid: Form List or Form Builder Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Directory / Selector */}
        <div className={selectedForm ? 'lg:col-span-4 space-y-4' : 'lg:col-span-12 space-y-4'}>
          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-border">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {['ALL', 'DEPLOYED', 'DRAFT'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    statusFilter === s
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  {s === 'ALL' ? 'All Forms' : s}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search forms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Forms List */}
          {loading ? (
            <div className="py-20 text-center text-text-muted space-y-3 bg-surface rounded-xl border border-border">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono">Loading forms...</p>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="p-12 text-center text-text-muted space-y-3 bg-surface rounded-xl border border-border">
              <CheckSquare className="w-8 h-8 text-text-muted mx-auto" />
              <h3 className="font-semibold text-sm text-text-primary">No forms created yet</h3>
              <p className="text-xs max-w-sm mx-auto">
                Create your first lead capture form or contact form to start collecting inquiries.
              </p>
              {SHOW_CREATE_FORM_BUTTON && (
                <Button size="sm" onClick={() => setShowCreateModal(true)} className="text-xs mt-2">
                  + Create Form
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredForms.map((form) => {
                const isSelected = selectedForm?.id === form.id;
                const leadAction = form.actions.find((a) => a.type === 'CREATE_LEAD');

                return (
                  <div
                    key={form.id}
                    onClick={() => setSelectedForm(form)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent/5 border-accent shadow-sm ring-1 ring-accent/30'
                        : 'bg-surface border-border hover:border-text-muted/40 hover:bg-surface-hover/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-text-primary font-display">{form.name}</h3>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                              form.status === 'DEPLOYED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {form.status}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted font-mono mt-0.5">Key: {form.publicKey.substring(0, 12)}...</p>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDeploy(form)}
                          className="p-1.5 rounded-lg bg-surface-hover hover:bg-border text-text-muted hover:text-text-primary transition-colors text-xs flex items-center gap-1"
                          title="Deploy / Embed"
                        >
                          <Code className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteForm(form.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                          title="Delete form"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px]">{form.fields.length} fields</span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">
                          {form._count?.submissions ?? 0} submission{form._count?.submissions === 1 ? '' : 's'}
                        </span>
                      </div>

                      {leadAction?.enabled && (
                        <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                          Lead Capture Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Form Builder / Configuration Editor */}
        {selectedForm && (
          <div className="lg:col-span-8 bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
            {/* Builder Header */}
            <div className="p-4 border-b border-border bg-surface-hover/30 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-display font-bold text-text-primary">{selectedForm.name}</h2>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                      selectedForm.status === 'DEPLOYED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {selectedForm.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted font-mono mt-0.5">
                  <span>Public Key: {selectedForm.publicKey}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleOpenDeploy(selectedForm)}
                  className="text-xs bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Deploy / Embed</span>
                </Button>

                <button
                  onClick={() => setSelectedForm(null)}
                  className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary"
                  title="Close builder"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Builder Tabs */}
            <div className="flex items-center border-b border-border bg-surface px-4">
              <button
                onClick={() => setActiveTab('fields')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'fields'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Fields ({selectedForm.fields.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('actions')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'actions'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Submission Actions ({selectedForm.actions.filter((a) => a.enabled).length} active)</span>
              </button>

              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              {/* TAB 1: FIELDS */}
              {activeTab === 'fields' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">Form Fields</h3>
                      <p className="text-xs text-text-muted">
                        Configure input fields, validation rules, placeholders, and reorder fields.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setShowAddFieldModal(true)}
                      className="text-xs bg-accent text-white hover:bg-accent-hover flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Field</span>
                    </Button>
                  </div>

                  {selectedForm.fields.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-border rounded-xl text-text-muted space-y-2">
                      <p className="text-xs">No fields added to this form yet.</p>
                      <Button size="sm" variant="outline" onClick={() => setShowAddFieldModal(true)} className="text-xs">
                        Add First Field
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedForm.fields
                        .sort((a, b) => a.order - b.order)
                        .map((field, idx) => (
                          <div
                            key={field.id}
                            className="p-3.5 bg-surface-hover/40 border border-border rounded-xl flex items-center justify-between gap-3 group hover:border-accent/40 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col gap-0.5">
                                <button
                                  disabled={idx === 0}
                                  onClick={() => handleMoveField(idx, 'up')}
                                  className="p-0.5 rounded hover:bg-surface text-text-muted hover:text-text-primary disabled:opacity-20"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  disabled={idx === selectedForm.fields.length - 1}
                                  onClick={() => handleMoveField(idx, 'down')}
                                  className="p-0.5 rounded hover:bg-surface text-text-muted hover:text-text-primary disabled:opacity-20"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-text-primary">{field.label}</span>
                                  {field.required && (
                                    <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.2 rounded">
                                      Required
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono text-text-muted uppercase px-1.5 py-0.2 rounded bg-surface border border-border">
                                    {field.type}
                                  </span>
                                </div>
                                <div className="text-[11px] font-mono text-text-muted mt-0.5">
                                  name: <code className="text-accent">{field.name}</code>
                                  {field.placeholder && (
                                    <span className="ml-2 opacity-75">placeholder: &quot;{field.placeholder}&quot;</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteField(field.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 opacity-60 group-hover:opacity-100 transition-opacity"
                              title="Delete field"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ACTIONS */}
              {activeTab === 'actions' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Post-Submission Pipeline</h3>
                    <p className="text-xs text-text-muted">
                      Configure what happens immediately after a visitor submits this form.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ACTION_TYPES.map((actionDef) => {
                      const currentAction = selectedForm.actions.find((a) => a.type === actionDef.type);
                      const isEnabled = currentAction?.enabled ?? false;
                      const Icon = actionDef.icon;

                      return (
                        <div
                          key={actionDef.type}
                          className={`p-4 rounded-xl border transition-all ${
                            isEnabled
                              ? 'bg-surface border-accent/40 shadow-sm'
                              : 'bg-surface-hover/20 border-border opacity-70 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2 rounded-lg border ${actionDef.color}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-text-primary font-display">{actionDef.label}</h4>
                                <p className="text-[11px] text-text-muted leading-relaxed mt-0.5">
                                  {actionDef.description}
                                </p>
                              </div>
                            </div>

                            {currentAction && (
                              <button
                                onClick={() => handleToggleAction(currentAction)}
                                className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                                  isEnabled ? 'bg-accent' : 'bg-border'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: LIVE PREVIEW */}
              {activeTab === 'preview' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Form Visual Preview</h3>
                    <p className="text-xs text-text-muted">
                      This is how the form inputs and labels will be rendered on the website.
                    </p>
                  </div>

                  <div className="p-6 bg-surface-hover/40 border border-border rounded-xl max-w-lg mx-auto space-y-4">
                    <h4 className="text-base font-bold text-text-primary font-display border-b border-border pb-2">
                      {selectedForm.name}
                    </h4>

                    {selectedForm.fields
                      .sort((a, b) => a.order - b.order)
                      .map((f) => (
                        <div key={f.id} className="space-y-1.5 text-xs">
                          <label className="font-semibold text-text-primary font-mono text-[11px] block">
                            {f.label} {f.required && <span className="text-red-400">*</span>}
                          </label>

                          {f.type === 'DROPDOWN' ? (
                            <select className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary font-mono text-xs focus:outline-none focus:border-accent">
                              <option value="">Select an option</option>
                              {JSON.parse(f.options || '[]').map((opt: string, i: number) => (
                                <option key={i} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={f.type === 'EMAIL' ? 'email' : f.type === 'PHONE' ? 'tel' : 'text'}
                              placeholder={f.placeholder || ''}
                              disabled
                              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary font-mono text-xs opacity-80"
                            />
                          )}
                        </div>
                      ))}

                    <Button size="sm" disabled className="w-full text-xs bg-accent text-white mt-4">
                      Submit Form
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Create Form (hidden -- see SHOW_CREATE_FORM_BUTTON above) */}
      {SHOW_CREATE_FORM_BUTTON && showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md my-auto max-h-[calc(100vh-2rem)] flex flex-col bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
              <h3 className="font-display font-bold text-sm text-text-primary">Create New Form</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateForm} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary font-mono text-[11px]">Form Name</label>
                <input
                  type="text"
                  placeholder="e.g. Contact Us, Request a Quote, Inquiry"
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-text-primary font-mono focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <p className="text-xs text-text-muted leading-relaxed">
                By default, this creates standard Name, Email, and Message fields, generates an unguessable public submission key, and activates the Lead Capture pipeline.
              </p>

              <div className="pt-2 flex items-center justify-between">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={creating || !newFormName.trim()} size="sm" className="text-xs bg-accent text-white hover:bg-accent-hover">
                  {creating ? 'Creating...' : 'Create Form'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Field */}
      {showAddFieldModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-auto max-h-[calc(100vh-2rem)] flex flex-col bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
              <h3 className="font-display font-bold text-sm text-text-primary">Add Form Field</h3>
              <button onClick={() => setShowAddFieldModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddField} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary font-mono text-[11px]">Field Type</label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg font-mono text-text-primary focus:outline-none focus:border-accent"
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft.type} value={ft.type}>
                      {ft.icon} {ft.label} ({ft.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-text-primary font-mono text-[11px]">Field Label</label>
                <input
                  type="text"
                  placeholder="e.g. Phone Number, Company Name, Preferred Date"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg font-mono text-text-primary focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary font-mono text-[11px]">HTML Field Name (Slug)</label>
                  <input
                    type="text"
                    placeholder="e.g. phone, company"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg font-mono text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary font-mono text-[11px]">Placeholder Text</label>
                  <input
                    type="text"
                    placeholder="e.g. +1 (555) 000-0000"
                    value={newFieldPlaceholder}
                    onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg font-mono text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {['DROPDOWN', 'RADIO', 'CHECKBOX'].includes(newFieldType) && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary font-mono text-[11px]">Options (one per line)</label>
                  <textarea
                    rows={3}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg font-mono text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reqCheckbox"
                  checked={newFieldRequired}
                  onChange={(e) => setNewFieldRequired(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <label htmlFor="reqCheckbox" className="font-mono text-xs text-text-primary cursor-pointer select-none">
                  Mark this field as mandatory (Required)
                </label>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddFieldModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="text-xs bg-accent text-white hover:bg-accent-hover">
                  Add Field
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Disable Lead Warning Modal */}
      {showDisableLeadModal && pendingActionToggle && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md my-auto max-h-[calc(100vh-2rem)] flex flex-col bg-surface border border-red-500/30 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center gap-2 bg-red-500/10 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-display font-bold text-sm">Disable Lead Pipeline?</h3>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-text-primary">
                Are you sure you want to disable <strong>Create Lead</strong>?
              </p>
              <p className="text-text-muted leading-relaxed">
                When disabled, submissions to this form will be stored raw in database logs, but will <strong>NOT</strong> appear in your active Leads inbox or pipeline.
              </p>

              <div className="pt-3 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDisableLeadModal(false);
                    setPendingActionToggle(null);
                  }}
                  className="text-xs"
                >
                  Keep Enabled
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    await executeActionUpdate(pendingActionToggle.id, false, undefined);
                    setShowDisableLeadModal(false);
                    setPendingActionToggle(null);
                  }}
                  className="text-xs bg-red-600 hover:bg-red-500 text-white"
                >
                  Yes, Disable Lead Capture
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Deploy / Embed Dialog */}
      {showDeployModal && deployingForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-auto max-h-[calc(100vh-2rem)] flex flex-col bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-accent" />
                <h3 className="font-display font-bold text-sm text-text-primary">
                  Deploy & Embed: {deployingForm.name}
                </h3>
              </div>
              <button onClick={() => setShowDeployModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Connector Status */}
              <div className="p-4 rounded-xl bg-surface-hover/50 border border-border flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-text-primary text-xs">Direct CMS / API Deployment</h4>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Target website: <span className="font-mono text-accent">{activeWebsite.domain || activeWebsite.name}</span>
                  </p>
                </div>

                <Button
                  size="sm"
                  disabled={savingForm}
                  onClick={handleExecuteDeploy}
                  className="text-xs bg-accent text-white hover:bg-accent-hover flex items-center gap-1.5"
                >
                  {savingForm ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{deployingForm.status === 'DEPLOYED' ? 'Re-Deploy Form' : 'Publish & Deploy'}</span>
                </Button>
              </div>

              {deployResult && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                    deployResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}
                >
                  {deployResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{deployResult.message || 'Form deployed successfully.'}</span>
                </div>
              )}

              {/* Universal HTML Embed Code */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-text-primary font-mono text-[11px] uppercase">
                    Universal HTML Embed Code (WordPress, Webflow, Shopify, Custom HTML)
                  </h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getEmbedCode(deployingForm));
                      setCopiedSnippet(true);
                      setTimeout(() => setCopiedSnippet(false), 2000);
                    }}
                    className="text-xs text-accent hover:underline flex items-center gap-1 font-mono"
                  >
                    {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSnippet ? 'Copied!' : 'Copy Embed Code'}</span>
                  </button>
                </div>

                <div className="p-3 bg-black/80 rounded-lg border border-border font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-48 leading-relaxed select-all">
                  <pre>{getEmbedCode(deployingForm)}</pre>
                </div>

                <p className="text-[11px] text-text-muted leading-relaxed">
                  Paste this snippet into any Custom HTML block, Gutenberg widget, or page template. Submissions will post securely to Tythas with honeypot spam filtering.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-surface-hover/30 flex justify-end">
              <Button size="sm" onClick={() => setShowDeployModal(false)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
