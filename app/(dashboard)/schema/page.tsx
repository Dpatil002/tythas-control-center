'use client';

import React, { useState, useEffect } from 'react';
import { useShell } from '@/components/shell/context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SCHEMA_REGISTRY, SchemaType, SchemaTypeDefinition } from '@/lib/schema/types';
import { generateJsonLd } from '@/lib/schema/generate';
import {
  Code2,
  Globe,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BookOpen,
  HelpCircle,
  Copy,
  Check,
  Eye,
  Settings2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export default function SchemaBuilderPage() {
  const { activeWebsite, setAddWebsiteOpen } = useShell();

  const [loading, setLoading] = useState(true);
  const [contentList, setContentList] = useState<Array<{ id: string; type: 'page' | 'post'; title: string; slug?: string; url?: string }>>([]);
  const [selectedContent, setSelectedContent] = useState<{ id: string; type: 'page' | 'post'; title: string; url?: string } | null>(null);
  const [existingSchemas, setExistingSchemas] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Editor state
  const [selectedType, setSelectedType] = useState<SchemaType>('FAQ_PAGE');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [rawJsonLd, setRawJsonLd] = useState('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [faqExtracting, setFaqExtracting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch all pages and posts for dropdown & recommendations
  const loadContentAndRecommendations = async () => {
    if (!activeWebsite) return;
    try {
      const [searchRes, recRes] = await Promise.all([
        fetch(`/api/websites/${activeWebsite.id}/content-search`),
        fetch(`/api/websites/${activeWebsite.id}/schema/recommendations`)
      ]);

      if (searchRes.ok) {
        const json = await searchRes.json();
        const items = json.data?.results || [];
        setContentList(items);
        if (items.length > 0 && !selectedContent) {
          setSelectedContent(items[0]);
        }
      }

      if (recRes.ok) {
        const json = await recRes.json();
        setRecommendations(json.data?.recommendations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadContentAndRecommendations();
  }, [activeWebsite?.id]);

  // Fetch schemas for currently selected content item
  const loadSchemasForSelectedContent = async () => {
    if (!activeWebsite || !selectedContent) return;

    const endpoint =
      selectedContent.type === 'page'
        ? `/api/websites/${activeWebsite.id}/pages/${selectedContent.id}/schema`
        : `/api/websites/${activeWebsite.id}/posts/${selectedContent.id}/schema`;

    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        setExistingSchemas(json.data?.schemas || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSchemasForSelectedContent();
    // Initialize default form data for selectedType
    resetFormForType(selectedType);
  }, [selectedContent?.id, selectedContent?.type]);

  const resetFormForType = (type: SchemaType) => {
    setSelectedType(type);
    setValidationResult(null);
    setSaveSuccess(null);

    if (type === 'FAQ_PAGE') {
      setFormData({
        faqs: [
          { question: 'What is your primary return policy?', answer: 'We offer a 30-day money-back guarantee on all unopened items.' },
          { question: 'How long does shipping take?', answer: 'Orders are processed within 24 hours and delivered in 3-5 business days.' }
        ]
      });
    } else if (type === 'ORGANIZATION') {
      setFormData({
        name: activeWebsite?.name || 'Tythas',
        url: `https://${(activeWebsite?.domain || '').replace(/^https?:\/\//, '')}`,
        logo: '',
        description: 'Digital agency & modern commerce platform.',
        sameAs: ''
      });
    } else if (type === 'LOCAL_BUSINESS') {
      setFormData({
        name: activeWebsite?.name || 'Tythas Store',
        streetAddress: '123 MG Road, Camp',
        addressLocality: 'Pune',
        addressRegion: 'Maharashtra',
        postalCode: '411001',
        addressCountry: 'IN',
        telephone: '+91 98765 43210',
        priceRange: '₹₹'
      });
    } else if (type === 'BLOG_POSTING' || type === 'ARTICLE') {
      setFormData({
        headline: selectedContent?.title || 'Comprehensive Guide to Modern Skincare',
        authorName: 'Editorial Team',
        datePublished: new Date().toISOString().split('T')[0],
        description: 'Explore the key principles and scientific active ingredients.'
      });
    } else if (type === 'PRODUCT') {
      setFormData({
        name: selectedContent?.title || 'Hydrating Facial Serum',
        price: '1499',
        priceCurrency: 'INR',
        sku: 'SKU-SERUM-01',
        availability: 'InStock',
        description: 'Premium restorative formula.'
      });
    } else if (type === 'BREADCRUMB_LIST') {
      setFormData({
        items: [
          { name: 'Home', url: `https://${(activeWebsite?.domain || '').replace(/^https?:\/\//, '')}/` },
          { name: selectedContent?.title || 'Current Page', url: `https://${(activeWebsite?.domain || '').replace(/^https?:\/\//, '')}/${selectedContent?.title?.toLowerCase().replace(/\s+/g, '-')}` }
        ]
      });
    } else {
      setFormData({});
    }
  };

  const currentDefinition = SCHEMA_REGISTRY[selectedType] || SCHEMA_REGISTRY.FAQ_PAGE;

  // Live JSON-LD generation
  const liveJsonLd = generateJsonLd(selectedType, formData);

  useEffect(() => {
    if (!isAdvancedMode) {
      setRawJsonLd(JSON.stringify(liveJsonLd, null, 2));
    }
  }, [formData, selectedType, isAdvancedMode]);

  const handleValidate = async () => {
    if (!activeWebsite) return;
    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/schema/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          data: formData
        })
      });
      const json = await res.json();
      setValidationResult({
        valid: json.data?.valid ?? false,
        errors: json.data?.errors || []
      });
    } catch (err: any) {
      setValidationResult({ valid: false, errors: [err.message] });
    }
  };

  const handleSaveSchema = async () => {
    if (!activeWebsite || !selectedContent) return;
    setSaving(true);
    setSaveSuccess(null);
    setValidationResult(null);

    const endpoint =
      selectedContent.type === 'page'
        ? `/api/websites/${activeWebsite.id}/pages/${selectedContent.id}/schema`
        : `/api/websites/${activeWebsite.id}/posts/${selectedContent.id}/schema`;

    try {
      let jsonLdOverride: Record<string, any> | undefined = undefined;
      if (isAdvancedMode && rawJsonLd.trim()) {
        try {
          jsonLdOverride = JSON.parse(rawJsonLd);
        } catch {
          throw new Error('Raw JSON-LD syntax is invalid. Please fix JSON formatting before saving.');
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          data: formData,
          jsonLdOverride,
          source: 'manual'
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to save schema');
      }

      setSaveSuccess('Schema saved and attached to ' + selectedContent.title);
      loadSchemasForSelectedContent();
    } catch (err: any) {
      setValidationResult({ valid: false, errors: [err.message] });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchema = async (schemaId: string) => {
    if (!activeWebsite || !selectedContent) return;
    const endpoint =
      selectedContent.type === 'page'
        ? `/api/websites/${activeWebsite.id}/pages/${selectedContent.id}/schema/${schemaId}`
        : `/api/websites/${activeWebsite.id}/posts/${selectedContent.id}/schema/${schemaId}`;

    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        loadSchemasForSelectedContent();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExtractFaqFromPost = async () => {
    if (!activeWebsite || !selectedContent || selectedContent.type !== 'post') return;
    setFaqExtracting(true);
    setSaveSuccess(null);

    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/posts/${selectedContent.id}/schema/faq-from-content`, {
        method: 'POST'
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'No FAQ blocks found in post content');
      }

      setSaveSuccess(`Extracted ${json.data?.extractedCount} FAQ items from content into schema!`);
      loadSchemasForSelectedContent();
      setSelectedType('FAQ_PAGE');
      if (json.data?.schema?.data) {
        setFormData(json.data.schema.data);
      }
    } catch (err: any) {
      setValidationResult({ valid: false, errors: [err.message] });
    } finally {
      setFaqExtracting(false);
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawJsonLd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeWebsite) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <EmptyState
          icon={<Globe className="w-6 h-6" />}
          title="No website selected"
          description="Select or connect a website to build structured JSON-LD schemas."
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
              Schema Builder
            </h1>
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-surface-hover text-text-muted border border-border">
              JSON-LD Generator
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 font-sans">
            Visual builder for Schema.org structured data to unlock Google Rich Snippets & knowledge panels.
          </p>
        </div>
      </div>

      {/* Recommendations Banner */}
      {recommendations.length > 0 && (
        <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase font-mono tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Auto-Detected Schema Opportunities ({recommendations.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-3 bg-surface rounded-lg border border-border flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-text-primary">{rec.title}</div>
                  <div className="text-text-muted text-[11px] mt-0.5">{rec.reason}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const match = contentList.find((c) => c.id === rec.contentId);
                    if (match) {
                      setSelectedContent(match);
                      resetFormForType(rec.type as SchemaType);
                    }
                  }}
                  className="text-xs h-7 px-2.5 flex-shrink-0"
                >
                  Configure
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target Content Selector Bar */}
      <div className="p-4 rounded-xl bg-surface border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-medium text-text-muted whitespace-nowrap">
            Target Page / Post:
          </label>
          <select
            value={selectedContent ? `${selectedContent.type}:${selectedContent.id}` : ''}
            onChange={(e) => {
              const [type, id] = e.target.value.split(':');
              const found = contentList.find((c) => c.id === id && c.type === type);
              if (found) setSelectedContent(found);
            }}
            className="px-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-primary font-medium focus:outline-none focus:border-accent w-full sm:w-80"
          >
            {contentList.map((c) => (
              <option key={`${c.type}:${c.id}`} value={`${c.type}:${c.id}`}>
                {c.type === 'page' ? '📄 Page: ' : '📝 Blog: '}
                {c.title} ({c.url})
              </option>
            ))}
          </select>
        </div>

        {selectedContent?.type === 'post' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExtractFaqFromPost}
            disabled={faqExtracting}
            className="flex items-center gap-1.5 text-xs text-accent border-accent/30 hover:bg-accent/10"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{faqExtracting ? 'Extracting...' : '1-Click FAQ Schema from Post'}</span>
          </Button>
        )}
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Type Picker & Form Generator (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Schema Type Picker Grid */}
          <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted">
                1. Select Schema Type
              </span>
              <span className="text-[11px] text-text-muted">{currentDefinition.category.toUpperCase()}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(SCHEMA_REGISTRY).map((def) => {
                const isSelected = selectedType === def.type;
                return (
                  <button
                    key={def.type}
                    type="button"
                    onClick={() => resetFormForType(def.type)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-accent/10 border-accent text-accent shadow-sm'
                        : 'bg-surface-hover border-border text-text-muted hover:text-text-primary hover:border-text-muted/30'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{def.label}</div>
                    <div className="text-[10px] opacity-70 truncate mt-0.5">{def.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Form Editor */}
          <div className="p-5 rounded-xl bg-surface border border-border space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-sm font-display font-bold text-text-primary">
                  {currentDefinition.label} Fields
                </h2>
                <p className="text-xs text-text-muted mt-0.5">{currentDefinition.description}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-mono transition-colors ${
                  isAdvancedMode
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface-hover text-text-muted border-border hover:text-text-primary'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{isAdvancedMode ? 'Advanced Raw Mode' : 'Visual Mode'}</span>
              </button>
            </div>

            {/* Notifications */}
            {saveSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {validationResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  validationResult.valid
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {validationResult.valid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Schema syntax & required Google fields are 100% valid!</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Validation Errors ({validationResult.errors.length}):</span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                        {validationResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}

            {isAdvancedMode ? (
              <div className="space-y-2">
                <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Advanced Mode: Direct hand edits to raw JSON-LD bypass standard form generation.
                  </span>
                </div>
                <textarea
                  rows={14}
                  value={rawJsonLd}
                  onChange={(e) => setRawJsonLd(e.target.value)}
                  className="w-full p-3 bg-[#18181b] border border-border rounded-lg text-xs font-mono text-emerald-400 focus:outline-none focus:border-accent resize-none"
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Special Render: FAQ List */}
                {selectedType === 'FAQ_PAGE' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-text-primary">
                        Question & Answer Pairs ({formData.faqs?.length || 0})
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const list = Array.isArray(formData.faqs) ? [...formData.faqs] : [];
                          list.push({ question: '', answer: '' });
                          setFormData({ ...formData, faqs: list });
                        }}
                        className="text-xs h-7 px-2 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add FAQ</span>
                      </Button>
                    </div>

                    {(formData.faqs || []).map((faq: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-surface-hover/40 border border-border rounded-xl space-y-2 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-text-muted uppercase">
                            Question #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const list = [...formData.faqs];
                              list.splice(idx, 1);
                              setFormData({ ...formData, faqs: list });
                            }}
                            className="text-text-muted hover:text-red-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. Do you ship internationally?"
                          value={faq.question || ''}
                          onChange={(e) => {
                            const list = [...formData.faqs];
                            list[idx] = { ...list[idx], question: e.target.value };
                            setFormData({ ...formData, faqs: list });
                          }}
                          className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
                        />
                        <textarea
                          rows={2}
                          placeholder="Answer description..."
                          value={faq.answer || ''}
                          onChange={(e) => {
                            const list = [...formData.faqs];
                            list[idx] = { ...list[idx], answer: e.target.value };
                            setFormData({ ...formData, faqs: list });
                          }}
                          className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Special Render: Breadcrumb List */}
                {selectedType === 'BREADCRUMB_LIST' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-text-primary">
                        Breadcrumb Steps ({formData.items?.length || 0})
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const list = Array.isArray(formData.items) ? [...formData.items] : [];
                          list.push({ name: '', url: '' });
                          setFormData({ ...formData, items: list });
                        }}
                        className="text-xs h-7 px-2 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Step</span>
                      </Button>
                    </div>

                    {(formData.items || []).map((step: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-surface-hover/40 border border-border rounded-xl flex items-center gap-2"
                      >
                        <span className="text-[11px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-surface border border-border">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          placeholder="Label (e.g. Products)"
                          value={step.name || ''}
                          onChange={(e) => {
                            const list = [...formData.items];
                            list[idx] = { ...list[idx], name: e.target.value };
                            setFormData({ ...formData, items: list });
                          }}
                          className="w-1/2 px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
                        />
                        <input
                          type="text"
                          placeholder="URL (e.g. https://.../products)"
                          value={step.url || ''}
                          onChange={(e) => {
                            const list = [...formData.items];
                            list[idx] = { ...list[idx], url: e.target.value };
                            setFormData({ ...formData, items: list });
                          }}
                          className="w-1/2 px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const list = [...formData.items];
                            list.splice(idx, 1);
                            setFormData({ ...formData, items: list });
                          }}
                          className="text-text-muted hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Standard Registry Fields */}
                {selectedType !== 'FAQ_PAGE' &&
                  selectedType !== 'BREADCRUMB_LIST' &&
                  currentDefinition.fields.map((f) => (
                    <div key={f.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-medium text-text-primary">
                          {f.label} {f.required && <span className="text-red-400">*</span>}
                        </label>
                      </div>

                      {f.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          placeholder={f.placeholder}
                          value={formData[f.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
                        />
                      ) : (
                        <input
                          type={f.type === 'number' ? 'number' : 'text'}
                          placeholder={f.placeholder}
                          value={formData[f.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
                        />
                      )}
                      {f.helpText && <p className="text-[11px] text-text-muted">{f.helpText}</p>}
                    </div>
                  ))}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleValidate}
                className="text-xs"
              >
                Validate JSON-LD
              </Button>

              <Button
                type="button"
                onClick={handleSaveSchema}
                disabled={saving}
                className="text-xs bg-accent text-white hover:bg-accent-hover flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Schema to Page</span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Live JSON-LD Preview & Existing Schemas (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Output Preview Card */}
          <div className="p-5 rounded-xl bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase text-text-primary">
                <Code2 className="w-3.5 h-3.5 text-accent" />
                <span>Live JSON-LD Output</span>
              </div>
              <button
                type="button"
                onClick={handleCopyJson}
                className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 font-mono transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="relative">
              <pre className="p-3.5 rounded-lg bg-[#0f1117] border border-border text-[#a6accd] text-[11px] font-mono overflow-x-auto max-h-[360px] leading-relaxed select-all">
                <code>{`<script type="application/ld+json">\n${rawJsonLd}\n</script>`}</code>
              </pre>
            </div>
          </div>

          {/* Existing Saved Schemas for this Page */}
          <div className="p-5 rounded-xl bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted">
                Active Schemas on this Item ({existingSchemas.length})
              </h3>
            </div>

            {existingSchemas.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted bg-surface-hover/30 rounded-lg border border-border/60">
                No schemas saved for this content yet. Use the builder to generate one.
              </div>
            ) : (
              <div className="space-y-2.5">
                {existingSchemas.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-surface-hover/50 border border-border rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-text-primary flex items-center gap-2">
                        <span>{s.type}</span>
                        {s.source === 'auto_faq' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-accent/10 text-accent">
                            AUTO FAQ
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-text-muted font-mono mt-0.5">
                        Updated {new Date(s.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedType(s.type as SchemaType);
                          setFormData(s.data);
                        }}
                        className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-text-primary"
                        title="Load into builder"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSchema(s.id)}
                        className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-red-400"
                        title="Delete schema"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
