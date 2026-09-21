'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
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
  Heading2,
  Heading3,
  Quote,
  Code,
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
  const [nodes, setNodes] = useState<DocNode[]>([]);
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

        // Parse content nodes
        const rawContent = p.content;
        if (rawContent && rawContent.type === 'doc' && Array.isArray(rawContent.content)) {
          setNodes(rawContent.content);
        } else if (Array.isArray(rawContent)) {
          setNodes(rawContent);
        } else {
          setNodes([
            { type: 'paragraph', content: [{ type: 'text', text: 'Start drafting article...' }] },
          ]);
        }
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
  const triggerAutosave = (updatedNodes: DocNode[], updatedTitle?: string, updatedAuthorId?: string) => {
    setAutosaveState('unsaved');
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    autosaveTimeoutRef.current = setTimeout(async () => {
      setAutosaveState('saving');
      try {
        const docJson = {
          type: 'doc',
          content: updatedNodes,
        };
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

  // Node manipulation helpers
  const handleAddNode = (type: string) => {
    let newNode: DocNode;
    switch (type) {
      case 'heading2':
        newNode = { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Section Heading' }] };
        break;
      case 'heading3':
        newNode = { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Subsection Heading' }] };
        break;
      case 'faqBlock':
        newNode = {
          type: 'faqBlock',
          attrs: {
            question: 'What are the primary benefits?',
            answer: 'Detailed explanation of key benefits and advantages...',
          },
        };
        break;
      case 'callout':
        newNode = {
          type: 'callout',
          attrs: { tone: 'info' },
          content: [{ type: 'text', text: 'Important takeaway note for readers.' }],
        };
        break;
      case 'quote':
        newNode = {
          type: 'blockquote',
          content: [{ type: 'text', text: 'Notable quote or highlight snippet.' }],
        };
        break;
      case 'code':
        newNode = {
          type: 'codeBlock',
          content: [{ type: 'text', text: '// Enter snippet or example code here' }],
        };
        break;
      case 'paragraph':
      default:
        newNode = {
          type: 'paragraph',
          content: [{ type: 'text', text: '' }],
        };
        break;
    }

    const updated = [...nodes, newNode];
    setNodes(updated);
    triggerAutosave(updated);
  };

  const handleUpdateNodeText = (index: number, text: string) => {
    const updated = [...nodes];
    updated[index] = {
      ...updated[index],
      content: [{ type: 'text', text }],
    };
    setNodes(updated);
    triggerAutosave(updated);
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
    triggerAutosave(updated);
  };

  const handleDeleteNode = (index: number) => {
    const updated = nodes.filter((_, i) => i !== index);
    setNodes(updated);
    triggerAutosave(updated);
  };

  const handleExplicitSave = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const docJson = {
        type: 'doc',
        content: nodes,
      };
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
      const docJson = { type: 'doc', content: nodes };
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
                      triggerAutosave(nodes, e.target.value);
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
                      triggerAutosave(nodes, title, e.target.value);
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

              {/* Toolbar Palette for Tiptap Nodes */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-border bg-surface sticky top-0 z-10 shadow-sm">
                <span className="text-[10px] font-bold text-text-tertiary uppercase px-2">Insert Block:</span>
                <button
                  onClick={() => handleAddNode('paragraph')}
                  className="px-2.5 py-1 text-xs rounded hover:bg-surface-2 text-text-secondary hover:text-text-primary flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" /> Paragraph
                </button>
                <button
                  onClick={() => handleAddNode('heading2')}
                  className="px-2.5 py-1 text-xs rounded hover:bg-surface-2 text-text-secondary hover:text-text-primary flex items-center gap-1"
                >
                  <Heading2 className="w-3.5 h-3.5" /> Heading 2
                </button>
                <button
                  onClick={() => handleAddNode('heading3')}
                  className="px-2.5 py-1 text-xs rounded hover:bg-surface-2 text-text-secondary hover:text-text-primary flex items-center gap-1"
                >
                  <Heading3 className="w-3.5 h-3.5" /> Heading 3
                </button>
                <button
                  onClick={() => handleAddNode('faqBlock')}
                  className="px-2.5 py-1 text-xs rounded bg-brand/10 text-brand hover:bg-brand/20 font-medium flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" /> FAQ Block
                </button>
                <button
                  onClick={() => handleAddNode('callout')}
                  className="px-2.5 py-1 text-xs rounded hover:bg-surface-2 text-text-secondary hover:text-text-primary flex items-center gap-1"
                >
                  <Info className="w-3.5 h-3.5" /> Callout Box
                </button>
                <button
                  onClick={() => handleAddNode('quote')}
                  className="px-2.5 py-1 text-xs rounded hover:bg-surface-2 text-text-secondary hover:text-text-primary flex items-center gap-1"
                >
                  <Quote className="w-3.5 h-3.5" /> Quote
                </button>
                <button
                  onClick={() => handleAddNode('code')}
                  className="px-2.5 py-1 text-xs rounded hover:bg-surface-2 text-text-secondary hover:text-text-primary flex items-center gap-1"
                >
                  <Code className="w-3.5 h-3.5" /> Code Block
                </button>
              </div>

              {/* Node stream */}
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

                  if (node.type === 'heading') {
                    const isH2 = node.attrs?.level === 2;
                    return (
                      <div key={idx} className="flex items-center gap-2 group">
                        <input
                          type="text"
                          value={nodeText}
                          onChange={(e) => handleUpdateNodeText(idx, e.target.value)}
                          placeholder={isH2 ? 'Heading 2' : 'Heading 3'}
                          className={`w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-text-primary font-display font-bold ${
                            isH2 ? 'text-lg' : 'text-base'
                          }`}
                        />
                        <button
                          onClick={() => handleDeleteNode(idx)}
                          className="p-1.5 rounded text-text-tertiary hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }

                  if (node.type === 'blockquote') {
                    return (
                      <div key={idx} className="flex items-center gap-2 group">
                        <textarea
                          value={nodeText}
                          onChange={(e) => handleUpdateNodeText(idx, e.target.value)}
                          placeholder="Quote citation..."
                          rows={2}
                          className="w-full px-3 py-1.5 text-xs italic bg-surface border-l-4 border-brand rounded-r-lg text-text-primary"
                        />
                        <button
                          onClick={() => handleDeleteNode(idx)}
                          className="p-1.5 rounded text-text-tertiary hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }

                  if (node.type === 'codeBlock') {
                    return (
                      <div key={idx} className="flex items-center gap-2 group">
                        <textarea
                          value={nodeText}
                          onChange={(e) => handleUpdateNodeText(idx, e.target.value)}
                          placeholder="// code snippet..."
                          rows={3}
                          className="w-full px-3 py-1.5 text-xs font-mono bg-zinc-900 text-zinc-100 border border-border rounded-lg"
                        />
                        <button
                          onClick={() => handleDeleteNode(idx)}
                          className="p-1.5 rounded text-text-tertiary hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }

                  // Default paragraph
                  return (
                    <div key={idx} className="flex items-start gap-2 group">
                      <textarea
                        value={nodeText}
                        onChange={(e) => handleUpdateNodeText(idx, e.target.value)}
                        placeholder="Write paragraph copy..."
                        rows={3}
                        className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary leading-relaxed focus:outline-none focus:border-brand"
                      />
                      <button
                        onClick={() => handleDeleteNode(idx)}
                        className="p-1.5 rounded text-text-tertiary hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
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
