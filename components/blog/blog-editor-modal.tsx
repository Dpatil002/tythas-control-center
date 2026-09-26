'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { SimpleRichTextEditor } from './simple-rich-text-editor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Calendar,
  Save,
  Send,
  History,
  RotateCcw,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Globe,
  HelpCircle,
  FileText,
  Info,
  User,
  Clock,
  Sparkles
} from 'lucide-react';

interface BlogEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  websiteId: string;
  websiteDomain: string;
  canWrite: boolean;
  onSaved?: () => void;
}

interface DocNode {
  type: string;
  attrs?: Record<string, any>;
  content?: any;
  text?: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Converts one node from the old multi-block editor (paragraph / heading / blockquote /
// codeBlock) into an HTML fragment, so existing article text survives the move to the new
// single-box editor.
function legacyNodeToHtml(node: DocNode): string {
  const text = Array.isArray(node.content)
    ? node.content.map((c: any) => c.text || '').join('')
    : (node as any).text || '';
  const safe = escapeHtml(text);
  if (node.type === 'heading') {
    const level = node.attrs?.level === 3 ? 3 : 2;
    return `<h${level}>${safe}</h${level}>`;
  }
  if (node.type === 'blockquote') return `<blockquote>${safe}</blockquote>`;
  if (node.type === 'codeBlock') return `<pre>${safe}</pre>`;
  if (!safe) return '';
  return `<p>${safe}</p>`;
}

// Builds the Tiptap-shaped doc we persist: a single richText node carrying the article body
// HTML, followed by any optional FAQ / Callout blocks the user added.
function buildDocJson(specialNodes: DocNode[], html: string) {
  return {
    type: 'doc',
    content: [{ type: 'richText', attrs: { html } }, ...specialNodes],
  };
}

export function BlogEditorModal({
  isOpen,
  onClose,
  postId,
  websiteId,
  websiteDomain,
  canWrite,
  onSaved,
}: BlogEditorModalProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'seo' | 'versions'>('editor');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [post, setPost] = useState<any>(null);
  const [authors, setAuthors] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);

  // Post state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [authorId, setAuthorId] = useState<string>('');
  const [nodes, setNodes] = useState<DocNode[]>([]); // holds only optional FAQ / Callout blocks now
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyVersion, setBodyVersion] = useState(0);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');

  // Scheduling Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  // Status & Autosave
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [autosaveState, setAutosaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPostDetails = async () => {
    if (!postId || !websiteId) return;
    setLoading(true);
    try {
      const [postRes, authorsRes] = await Promise.all([
        fetch(`/api/websites/${websiteId}/posts/${postId}`),
        fetch(`/api/websites/${websiteId}/authors`),
      ]);

      if (postRes.ok) {
        const json = await postRes.json();
        const p = json.data.post;
        setPost(p);
        setTitle(p.title);
        setSlug(p.slug);
        setAuthorId(p.authorId || '');
        setSeoTitle(p.seoTitle || '');
        setSeoDescription(p.seoDescription || '');
        setFocusKeyword(p.focusKeyword || '');
        setVersions(p.versions || []);

        // Parse content nodes, splitting the flowing article body (paragraph / heading /
        // blockquote / codeBlock / richText) from the optional FAQ & Callout blocks. Any
        // legacy flow nodes (from the old multi-block editor) are converted into HTML so
        // previously written article text still shows up in the new single-box editor.
        const rawContent = p.content;
        const allNodes: DocNode[] = rawContent && rawContent.type === 'doc' && Array.isArray(rawContent.content)
          ? rawContent.content
          : Array.isArray(rawContent)
          ? rawContent
          : [];

        const specialNodes = allNodes.filter((n) => n.type === 'faqBlock' || n.type === 'callout');
        const richTextNode = allNodes.find((n) => n.type === 'richText');
        const legacyFlowNodes = allNodes.filter(
          (n) => n.type !== 'faqBlock' && n.type !== 'callout' && n.type !== 'richText'
        );

        setNodes(specialNodes);
        setBodyHtml(
          richTextNode
            ? (richTextNode as any).attrs?.html || ''
            : legacyFlowNodes.length > 0
            ? legacyFlowNodes.map(legacyNodeToHtml).join('')
            : ''
        );
        setBodyVersion((v) => v + 1);
      }

      if (authorsRes.ok) {
        const json = await authorsRes.json();
        setAuthors(json.data.authors || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setAutosaveState('saved');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPostDetails();
      setStatusMessage(null);
    }
  }, [isOpen, postId, websiteId]);

  // Debounced Autosave to database
  const triggerAutosave = (
    updatedNodes: DocNode[],
    updatedBodyHtml: string,
    updatedTitle?: string,
    updatedAuthorId?: string
  ) => {
    setAutosaveState('unsaved');
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    autosaveTimeoutRef.current = setTimeout(async () => {
      setAutosaveState('saving');
      try {
        const docJson = buildDocJson(updatedNodes, updatedBodyHtml);
        await fetch(`/api/websites/${websiteId}/posts/${postId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: updatedTitle ?? title,
            authorId: (updatedAuthorId !== undefined ? updatedAuthorId : authorId) || null,
            content: docJson,
            saveVersion: false, // only explicit saves generate version rows
          }),
        });
        setAutosaveState('saved');
      } catch {
        setAutosaveState('unsaved');
      }
    }, 1500);
  };

  // Optional-section manipulation helpers (FAQ / Callout blocks only -- the flowing article
  // body is handled by the single rich-text editor below via handleBodyChange).
  const handleAddNode = (type: 'faqBlock' | 'callout') => {
    const newNode: DocNode =
      type === 'faqBlock'
        ? {
            type: 'faqBlock',
            attrs: {
              question: 'What are the primary benefits?',
              answer: 'Detailed explanation of key benefits and advantages...',
            },
          }
        : {
            type: 'callout',
            attrs: { tone: 'info' },
            content: [{ type: 'text', text: 'Important takeaway note for readers.' }],
          };

    const updated = [...nodes, newNode];
    setNodes(updated);
    triggerAutosave(updated, bodyHtml);
  };

  const handleBodyChange = (html: string) => {
    setBodyHtml(html);
    triggerAutosave(nodes, html);
  };

  const handleUpdateNodeText = (index: number, text: string) => {
    const updated = [...nodes];
    updated[index] = {
      ...updated[index],
      content: [{ type: 'text', text }],
    };
    setNodes(updated);
    triggerAutosave(updated, bodyHtml);
  };

  const handleUpdateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...nodes];
    const node = updated[index];
    node.attrs = {
      ...node.attrs,
      [field]: value,
    };
    updated[index] = node;
    setNodes(updated);
    triggerAutosave(updated, bodyHtml);
  };

  const handleDeleteNode = (index: number) => {
    const updated = nodes.filter((_, i) => i !== index);
    setNodes(updated);
    triggerAutosave(updated, bodyHtml);
  };

  const handleExplicitSave = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const docJson = buildDocJson(nodes, bodyHtml);
      const res = await fetch(`/api/websites/${websiteId}/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          authorId: authorId || null,
          content: docJson,
          seoTitle,
          seoDescription,
          focusKeyword,
          saveVersion: true,
          summary: 'Explicit manual snapshot save',
        }),
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Article saved and version snapshot recorded.' });
        fetchPostDetails();
        onSaved?.();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving post' });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setStatusMessage(null);
    try {
      // First save
      const docJson = buildDocJson(nodes, bodyHtml);
      await fetch(`/api/websites/${websiteId}/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          authorId: authorId || null,
          content: docJson,
          seoTitle,
          seoDescription,
          focusKeyword,
        }),
      });

      const res = await fetch(`/api/websites/${websiteId}/posts/${postId}/publish`, {
        method: 'POST',
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Blog article published live to website via connector!' });
        fetchPostDetails();
        onSaved?.();
      } else {
        const json = await res.json();
        setStatusMessage({ type: 'error', text: json.error?.message || 'Publishing failed' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error publishing post' });
    } finally {
      setPublishing(false);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate) return;
    setScheduling(true);
    try {
      const res = await fetch(`/api/websites/${websiteId}/posts/${postId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: scheduledDate }),
      });
      if (res.ok) {
        setScheduleModalOpen(false);
        setStatusMessage({ type: 'success', text: `Article scheduled for ${new Date(scheduledDate).toLocaleString()}` });
        fetchPostDetails();
        onSaved?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setScheduling(false);
    }
  };

  const handleRestoreVersion = async (vId: string) => {
    if (!confirm('Restore this version snapshot? Unsaved changes will be replaced.')) return;
    try {
      const res = await fetch(`/api/websites/${websiteId}/posts/${postId}/versions/${vId}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Version restored successfully!' });
        fetchPostDetails();
        onSaved?.();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="5xl">
      <div className="flex flex-col h-[85vh] -m-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary font-display">{title || 'Untitled Post'}</h2>
                <Badge
                  variant={
                    post?.status === 'PUBLISHED'
                      ? 'success'
                      : post?.status === 'SCHEDULED'
                      ? 'info'
                      : 'warning'
                  }
                >
                  {post?.status || 'DRAFT'}
                </Badge>
                <span className="text-[11px] text-text-tertiary">
                  {autosaveState === 'saving' ? (
                    <span className="text-amber-500 animate-pulse">Autosaving...</span>
                  ) : autosaveState === 'saved' ? (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Saved to draft
                    </span>
                  ) : (
                    <span className="text-text-tertiary">Unsaved edits</span>
                  )}
                </span>
              </div>
              <p className="text-xs text-text-tertiary">
                {websiteDomain}{slug}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScheduleModalOpen(true)}
              className="gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Schedule
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExplicitSave}
              disabled={saving}
              className="gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Snapshot'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePublish}
              disabled={!canWrite || publishing}
              title={!canWrite ? 'Publishing is disabled for Audit-Only websites' : ''}
              className="gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {publishing ? 'Publishing...' : 'Publish Live'}
            </Button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center px-6 border-b border-border bg-surface-2/40 text-xs">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'editor'
                ? 'border-brand text-brand font-semibold'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <FileText className="w-4 h-4" />
            Article Content
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

        {/* Status Alert */}
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
          ) : activeTab === 'editor' ? (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Meta header controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-border bg-surface">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Article Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      triggerAutosave(nodes, bodyHtml, e.target.value);
                    }}
                    placeholder="Article Headline..."
                    className="w-full px-3 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Author</label>
                  <select
                    value={authorId}
                    onChange={(e) => {
                      setAuthorId(e.target.value);
                      triggerAutosave(nodes, bodyHtml, title, e.target.value);
                    }}
                    className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
                  >
                    <option value="">Select Author...</option>
                    {authors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.roleLabel || 'Author'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Article body: one continuous writing box, WordPress-classic style */}
              <SimpleRichTextEditor
                value={bodyHtml}
                onChange={handleBodyChange}
                resetKey={`${postId}-${bodyVersion}`}
                placeholder="Start writing your article..."
              />

              {/* Optional sections: FAQ / Callout, kept separate from the main body so the
                  writing box itself stays a single simple area. */}
              <div className="space-y-3">
                {nodes.map((node, idx) => {
                  const nodeText = Array.isArray(node.content)
                    ? node.content.map((c: any) => c.text || '').join('')
                    : node.text || '';

                  if (node.type === 'faqBlock') {
                    return (
                      <div key={idx} className="p-4 rounded-xl border border-brand/30 bg-brand/5 space-y-2 relative group">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-brand flex items-center gap-1">
                            <HelpCircle className="w-3.5 h-3.5" /> FAQ Question & Answer Block
                          </span>
                          <button
                            onClick={() => handleDeleteNode(idx)}
                            className="p-1 rounded text-text-tertiary hover:text-rose-500"
                            title="Delete FAQ Block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={node.attrs?.question || ''}
                          onChange={(e) => handleUpdateFaq(idx, 'question', e.target.value)}
                          placeholder="Frequently Asked Question..."
                          className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-primary font-semibold focus:outline-none focus:border-brand"
                        />
                        <textarea
                          value={node.attrs?.answer || ''}
                          onChange={(e) => handleUpdateFaq(idx, 'answer', e.target.value)}
                          placeholder="Detailed answer..."
                          rows={2}
                          className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-secondary focus:outline-none focus:border-brand"
                        />
                      </div>
                    );
                  }

                  if (node.type === 'callout') {
                    return (
                      <div key={idx} className="p-4 rounded-xl border border-border bg-surface-2/60 space-y-1 relative group">
                        <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
                          <span className="flex items-center gap-1 font-semibold text-text-secondary">
                            <Info className="w-3.5 h-3.5 text-brand" /> Callout Highlight Box
                          </span>
                          <button
                            onClick={() => handleDeleteNode(idx)}
                            className="p-1 rounded text-text-tertiary hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea
                          value={nodeText}
                          onChange={(e) => handleUpdateNodeText(idx, e.target.value)}
                          placeholder="Highlight callout text..."
                          rows={2}
                          className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-primary"
                        />
                      </div>
                    );
                  }

                  return null;
                })}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAddNode('faqBlock')}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-dashed border-border hover:border-brand/50 hover:bg-brand/5 text-text-secondary hover:text-brand flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Add FAQ Section
                  </button>
                  <button
                    onClick={() => handleAddNode('callout')}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-dashed border-border hover:border-brand/50 hover:bg-brand/5 text-text-secondary hover:text-brand flex items-center gap-1.5"
                  >
                    <Info className="w-3.5 h-3.5" /> Add Callout Box
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'seo' ? (
            <div className="max-w-2xl mx-auto space-y-5 p-6 rounded-xl border border-border bg-surface">
              <h3 className="text-sm font-bold text-text-primary font-display flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand" /> Article SEO Metadata
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">SEO Title</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="Article search title"
                    className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Meta Description</label>
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    rows={3}
                    placeholder="Summary description for SERP results"
                    className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Focus Keyword</label>
                  <input
                    type="text"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    placeholder="Target search keyword"
                    className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              <h3 className="text-sm font-bold text-text-primary font-display flex items-center gap-2">
                <History className="w-4 h-4 text-brand" /> Article Version Snapshots
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
        </div>
      </div>

      {/* Schedule Modal */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Schedule Publication"
        description="Set the date and time when this article should automatically publish."
        maxWidth="sm"
      >
        <form onSubmit={handleSchedule} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Publication Date & Time</label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={scheduling || !scheduledDate}>
              {scheduling ? 'Scheduling...' : 'Confirm Schedule'}
            </Button>
          </div>
        </form>
      </Modal>
    </Modal>
  );
}
