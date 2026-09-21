'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SECTION_TYPES, getSectionTypeDef } from '@/lib/content/section-types';
import { SectionRenderer } from './section-renderer';
import {
  Layers,
  Sparkles,
  Eye,
  History,
  Save,
  Send,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Globe,
  Settings,
  HelpCircle,
  Monitor,
  Tablet,
  Smartphone
} from 'lucide-react';

interface PageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  websiteId: string;
  websiteDomain: string;
  canWrite: boolean;
  onSaved?: () => void;
}

export function PageEditorModal({
  isOpen,
  onClose,
  pageId,
  websiteId,
  websiteDomain,
  canWrite,
  onSaved,
}: PageEditorModalProps) {
  const [activeTab, setActiveTab] = useState<'sections' | 'seo' | 'preview' | 'versions'>('sections');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [page, setPage] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [h1, setH1] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');

  const fetchPageDetails = async () => {
    if (!pageId || !websiteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/websites/${websiteId}/pages/${pageId}`);
      if (res.ok) {
        const data = await res.json();
        const p = data.data.page;
        setPage(p);
        setTitle(p.title);
        setSlug(p.slug);
        setSeoTitle(p.seoTitle || '');
        setSeoDescription(p.seoDescription || '');
        setH1(p.h1 || '');
        setFocusKeyword(p.focusKeyword || '');
        setSections(p.sections || []);
        setVersions(p.versions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPageDetails();
      setStatusMessage(null);
    }
  }, [isOpen, pageId, websiteId]);

  const handleAddSection = (type: string) => {
    const typeDef = getSectionTypeDef(type);
    const newSection = {
      id: `temp_${Date.now()}`,
      type,
      order: sections.length,
      content: JSON.parse(JSON.stringify(typeDef.defaultContent)),
    };
    setSections([...sections, newSection]);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const newSections = [...sections];
    const temp = newSections[index];
    newSections[index] = newSections[targetIdx];
    newSections[targetIdx] = temp;

    // re-assign orders
    newSections.forEach((s, idx) => (s.order = idx));
    setSections(newSections);
  };

  const handleDuplicateSection = (index: number) => {
    const sectionToDup = sections[index];
    const newSection = {
      ...sectionToDup,
      id: `temp_${Date.now()}`,
      order: index + 1,
    };
    const newSections = [...sections];
    newSections.splice(index + 1, 0, newSection);
    newSections.forEach((s, idx) => (s.order = idx));
    setSections(newSections);
  };

  const handleDeleteSection = (index: number) => {
    const newSections = sections.filter((_, idx) => idx !== index);
    newSections.forEach((s, idx) => (s.order = idx));
    setSections(newSections);
  };

  const handleUpdateSectionField = (sectionIndex: number, fieldName: string, value: any) => {
    const newSections = [...sections];
    const section = { ...newSections[sectionIndex] };
    section.content = {
      ...(typeof section.content === 'string' ? JSON.parse(section.content) : section.content),
      [fieldName]: value,
    };
    newSections[sectionIndex] = section;
    setSections(newSections);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/websites/${websiteId}/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          seoTitle,
          seoDescription,
          h1,
          focusKeyword,
          sections,
          summary: 'Saved draft in visual editor',
        }),
      });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Draft saved to database successfully.' });
        fetchPageDetails();
        onSaved?.();
      } else {
        const json = await res.json();
        setStatusMessage({ type: 'error', text: json.error?.message || 'Failed to save draft' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving draft' });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setStatusMessage(null);
    try {
      // First save current draft changes
      await fetch(`/api/websites/${websiteId}/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          seoTitle,
          seoDescription,
          h1,
          focusKeyword,
          sections,
          summary: 'Pre-publish draft sync',
        }),
      });

      // Now call publish
      const res = await fetch(`/api/websites/${websiteId}/pages/${pageId}/publish`, {
        method: 'POST',
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Page published live via connector successfully!' });
        setPublishDialogOpen(false);
        fetchPageDetails();
        onSaved?.();
      } else {
        const json = await res.json();
        setStatusMessage({ type: 'error', text: json.error?.message || 'Publishing failed.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Publish error' });
    } finally {
      setPublishing(false);
    }
  };

  const handleRestoreVersion = async (vId: string) => {
    if (!confirm('Are you sure you want to restore this version snapshot? Unsaved changes in your current session will be replaced.')) return;
    try {
      const res = await fetch(`/api/websites/${websiteId}/pages/${pageId}/versions/${vId}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Version restored successfully!' });
        fetchPageDetails();
        onSaved?.();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="6xl">
      <div className="flex flex-col h-[85vh] -m-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary font-display">{title || 'Untitled Page'}</h2>
                <Badge variant={page?.status === 'PUBLISHED' ? 'success' : 'warning'}>
                  {page?.status || 'DRAFT'}
                </Badge>
              </div>
              <p className="text-xs text-text-tertiary">
                {websiteDomain}{slug} • {sections.length} sections
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {!canWrite && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Audit Only (Read-Only)</span>
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveDraft}
              disabled={saving}
              className="gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setPublishDialogOpen(true)}
              disabled={!canWrite || publishing}
              title={!canWrite ? 'Publishing is disabled for Audit-Only websites' : ''}
              className="gap-1.5"
            >
              <Send className="w-4 h-4" />
              Publish Live
            </Button>
          </div>
        </div>

        {/* Sub-tabs bar */}
        <div className="flex items-center justify-between px-6 border-b border-border bg-surface-2/40 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('sections')}
              className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'sections'
                  ? 'border-brand text-brand font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Layers className="w-4 h-4" />
              Section Builder ({sections.length})
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'seo'
                  ? 'border-brand text-brand font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Globe className="w-4 h-4" />
              SEO & Metadata
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'border-brand text-brand font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Eye className="w-4 h-4" />
              Live Preview
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'versions'
                  ? 'border-brand text-brand font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <History className="w-4 h-4" />
              Version History ({versions.length})
            </button>
          </div>

          {activeTab === 'preview' && (
            <div className="flex items-center gap-1 bg-surface border border-border rounded-md p-0.5">
              <button
                onClick={() => setPreviewViewport('desktop')}
                className={`p-1 rounded ${previewViewport === 'desktop' ? 'bg-surface-2 text-brand' : 'text-text-tertiary'}`}
                title="Desktop Viewport"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewViewport('tablet')}
                className={`p-1 rounded ${previewViewport === 'tablet' ? 'bg-surface-2 text-brand' : 'text-text-tertiary'}`}
                title="Tablet Viewport"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewViewport('mobile')}
                className={`p-1 rounded ${previewViewport === 'mobile' ? 'bg-surface-2 text-brand' : 'text-text-tertiary'}`}
                title="Mobile Viewport"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Status notification */}
        {statusMessage && (
          <div
            className={`px-6 py-2 text-xs flex items-center gap-2 border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface-2/20">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
            </div>
          ) : (
            <>
              {/* TAB 1: SECTIONS BUILDER */}
              {activeTab === 'sections' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Page Basic Settings bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-surface">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Page Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
                        placeholder="e.g. Home, About Us, Services"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">URL Slug</label>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
                        placeholder="e.g. / or /about"
                      />
                    </div>
                  </div>

                  {/* Section List / Accordion */}
                  <div className="space-y-4">
                    {sections.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-border rounded-xl bg-surface">
                        <Layers className="w-8 h-8 mx-auto mb-2 text-text-tertiary" />
                        <p className="text-sm font-semibold text-text-primary">No sections on this page</p>
                        <p className="text-xs text-text-tertiary mt-1">Click a section type below to add your first section.</p>
                      </div>
                    ) : (
                      sections.map((section, idx) => {
                        const typeDef = getSectionTypeDef(section.type);
                        const content = typeof section.content === 'string' ? JSON.parse(section.content || '{}') : (section.content || {});

                        return (
                          <div key={section.id || idx} className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
                            {/* Section Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-surface-2/40 border-b border-border">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-brand/10 text-brand font-bold text-xs flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-semibold text-text-primary">{typeDef.label}</span>
                                <span className="text-[10px] text-text-tertiary uppercase tracking-wider bg-surface px-2 py-0.5 rounded border border-border">
                                  {section.type}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleMoveSection(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 rounded hover:bg-surface text-text-tertiary hover:text-text-primary disabled:opacity-30"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleMoveSection(idx, 'down')}
                                  disabled={idx === sections.length - 1}
                                  className="p-1 rounded hover:bg-surface text-text-tertiary hover:text-text-primary disabled:opacity-30"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDuplicateSection(idx)}
                                  className="p-1 rounded hover:bg-surface text-text-tertiary hover:text-text-primary"
                                  title="Duplicate Section"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSection(idx)}
                                  className="p-1 rounded hover:bg-rose-500/10 text-text-tertiary hover:text-rose-500"
                                  title="Delete Section"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Section Fields */}
                            <div className="p-4 space-y-3">
                              {typeDef.fields.map((f) => (
                                <div key={f.name}>
                                  <label className="block text-xs font-medium text-text-secondary mb-1">
                                    {f.label} {f.required && <span className="text-rose-500">*</span>}
                                  </label>

                                  {f.type === 'textarea' ? (
                                    <textarea
                                      value={content[f.name] || ''}
                                      onChange={(e) => handleUpdateSectionField(idx, f.name, e.target.value)}
                                      placeholder={f.placeholder}
                                      rows={3}
                                      className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
                                    />
                                  ) : f.type === 'list' ? (
                                    <div className="space-y-2 p-3 rounded-lg bg-surface-2/30 border border-border">
                                      {(content[f.name] || []).map((item: any, itemIdx: number) => (
                                        <div key={itemIdx} className="p-2 rounded bg-surface border border-border/80 space-y-2">
                                          <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                                            <span>Item {itemIdx + 1}</span>
                                            <button
                                              onClick={() => {
                                                const newItems = [...(content[f.name] || [])];
                                                newItems.splice(itemIdx, 1);
                                                handleUpdateSectionField(idx, f.name, newItems);
                                              }}
                                              className="text-rose-500 hover:text-rose-600 text-[10px]"
                                            >
                                              Remove
                                            </button>
                                          </div>
                                          {Object.entries(f.itemSchema || {}).map(([key, schema]) => (
                                            <div key={key}>
                                              <span className="block text-[10px] text-text-tertiary mb-0.5">{schema.label}</span>
                                              <input
                                                type="text"
                                                value={item[key] || ''}
                                                onChange={(e) => {
                                                  const newItems = [...(content[f.name] || [])];
                                                  newItems[itemIdx] = { ...newItems[itemIdx], [key]: e.target.value };
                                                  handleUpdateSectionField(idx, f.name, newItems);
                                                }}
                                                placeholder={schema.placeholder}
                                                className="w-full px-2 py-1 text-xs bg-surface border border-border rounded text-text-primary"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      ))}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const newItems = [...(content[f.name] || []), { title: 'New Item', description: 'Item description...' }];
                                          handleUpdateSectionField(idx, f.name, newItems);
                                        }}
                                        className="w-full text-xs py-1"
                                      >
                                        <Plus className="w-3 h-3 mr-1" /> Add {f.label} Item
                                      </Button>
                                    </div>
                                  ) : (
                                    <input
                                      type={f.type === 'number' ? 'number' : 'text'}
                                      value={content[f.name] || ''}
                                      onChange={(e) => handleUpdateSectionField(idx, f.name, e.target.value)}
                                      placeholder={f.placeholder}
                                      className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add Section Palette */}
                  <div className="p-5 rounded-xl border border-dashed border-border bg-surface">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
                      Add New Component Section
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.values(SECTION_TYPES).map((st) => (
                        <button
                          key={st.type}
                          onClick={() => handleAddSection(st.type)}
                          className="flex flex-col items-center p-3 rounded-lg border border-border hover:border-brand/50 hover:bg-brand/5 transition-all text-center group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                            <Plus className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-semibold text-text-primary">{st.label}</span>
                          <span className="text-[10px] text-text-tertiary mt-0.5 line-clamp-1">{st.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SEO & METADATA */}
              {activeTab === 'seo' && (
                <div className="max-w-2xl mx-auto space-y-5 p-6 rounded-xl border border-border bg-surface">
                  <h3 className="text-sm font-bold text-text-primary font-display flex items-center gap-2">
                    <Globe className="w-4 h-4 text-brand" /> Page SEO Parameters
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">SEO Title</label>
                      <input
                        type="text"
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        placeholder="Page title displayed in Google search results"
                        className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
                      />
                      <span className="text-[10px] text-text-tertiary mt-1 block">Optimal length: 50-60 characters ({seoTitle.length} chars)</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Meta Description</label>
                      <textarea
                        value={seoDescription}
                        onChange={(e) => setSeoDescription(e.target.value)}
                        rows={3}
                        placeholder="Brief summary snippet shown in search listings"
                        className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
                      />
                      <span className="text-[10px] text-text-tertiary mt-1 block">Optimal length: 120-160 characters ({seoDescription.length} chars)</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Main Heading (H1)</label>
                      <input
                        type="text"
                        value={h1}
                        onChange={(e) => setH1(e.target.value)}
                        placeholder="Primary semantic H1 heading"
                        className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Focus Keyword</label>
                      <input
                        type="text"
                        value={focusKeyword}
                        onChange={(e) => setFocusKeyword(e.target.value)}
                        placeholder="e.g. enterprise website platform"
                        className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LIVE PREVIEW */}
              {activeTab === 'preview' && (
                <div className="flex justify-center">
                  <div
                    className={`transition-all duration-300 border border-border rounded-xl bg-surface shadow-lg overflow-hidden ${
                      previewViewport === 'desktop'
                        ? 'w-full max-w-5xl'
                        : previewViewport === 'tablet'
                        ? 'w-[768px]'
                        : 'w-[375px]'
                    }`}
                  >
                    {/* Simulated Browser Bar */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-2 border-b border-border text-xs text-text-tertiary">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <div className="flex-1 text-center bg-surface px-3 py-0.5 rounded text-[11px] text-text-secondary truncate border border-border">
                        https://{websiteDomain}{slug}
                      </div>
                    </div>
                    {/* Rendered View */}
                    <div className="p-6">
                      <SectionRenderer sections={sections} previewMode />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: VERSION HISTORY */}
              {activeTab === 'versions' && (
                <div className="max-w-2xl mx-auto space-y-4">
                  <h3 className="text-sm font-bold text-text-primary font-display flex items-center gap-2">
                    <History className="w-4 h-4 text-brand" /> Page Snapshot History
                  </h3>
                  {versions.length === 0 ? (
                    <div className="p-6 text-center border border-border rounded-xl bg-surface text-text-tertiary text-xs">
                      No version history snapshots available yet.
                    </div>
                  ) : (
                    versions.map((v) => (
                      <div key={v.id} className="p-4 rounded-xl border border-border bg-surface flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-text-primary">{v.summary || 'Version snapshot'}</div>
                          <div className="text-[10px] text-text-tertiary mt-0.5">
                            Created: {new Date(v.createdAt).toLocaleString()} by {v.createdBy || 'System'}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreVersion(v.id)}
                          className="gap-1 text-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restore
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Publish Confirmation Modal */}
      <Modal
        isOpen={publishDialogOpen}
        onClose={() => setPublishDialogOpen(false)}
        title="Confirm Publish to Live Website"
        description="Review changes before publishing to your connected website."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Medium / High Risk Tier:</span> Publishing will update the public website via connector sync.
            </div>
          </div>

          <div className="space-y-2 text-xs text-text-secondary border-t border-b border-border py-3">
            <div className="flex justify-between">
              <span className="text-text-tertiary">Target URL:</span>
              <span className="font-mono text-text-primary">https://{websiteDomain}{slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Total Sections:</span>
              <span className="font-semibold text-text-primary">{sections.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Status change:</span>
              <span className="text-emerald-500 font-semibold">{page?.status} ➔ PUBLISHED</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setPublishDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handlePublish} disabled={publishing}>
              {publishing ? 'Publishing...' : 'Confirm & Publish'}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}
