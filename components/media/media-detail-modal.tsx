'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Image as ImageIcon,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Tag,
  Folder,
  FileCheck
} from 'lucide-react';

interface MediaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: any | null;
  websiteId: string;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function MediaDetailModal({
  isOpen,
  onClose,
  media,
  websiteId,
  onUpdated,
  onDeleted,
}: MediaDetailModalProps) {
  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [folder, setFolder] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (media) {
      setTitle(media.title || '');
      setAltText(media.altText || '');
      setCaption(media.caption || '');
      setFolder(media.folder || '');
      setError(null);
    }
  }, [media]);

  if (!media) return null;

  const sizeKb = media.sizeBytes ? (media.sizeBytes / 1024).toFixed(1) : '—';
  const ext = (media.format || media.filename.split('.').pop() || '').toUpperCase();
  const isMissingAlt = !altText || altText.trim() === '';
  const isOversized = (media.sizeBytes || 0) > 500 * 1024;
  const isNonModern = !['WEBP', 'AVIF', 'SVG'].includes(ext);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/websites/${websiteId}/media/${media.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          altText: altText || null,
          caption: caption || null,
          folder: folder || null,
        }),
      });
      if (res.ok) {
        onUpdated();
        onClose();
      } else {
        const json = await res.json();
        setError(json.error?.message || 'Failed to update metadata');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating metadata');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this media asset?')) return;
    try {
      const res = await fetch(`/api/websites/${websiteId}/media/${media.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onDeleted();
        onClose();
      } else {
        const json = await res.json();
        setError(json.error?.message || 'Failed to delete asset');
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting asset');
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(media.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={media.title || media.filename}
      description={`Asset ID: ${media.id}`}
      maxWidth="3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 -m-2">
        {/* Left: Preview & File Details */}
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border border-border bg-surface-2 flex items-center justify-center min-h-[220px] max-h-[300px]">
            {media.url.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)($|\?)/i) || media.url.startsWith('/') ? (
              <img
                src={media.url}
                alt={media.altText || media.title}
                className="max-h-[280px] w-auto max-w-full object-contain"
              />
            ) : (
              <div className="p-8 text-center text-text-tertiary">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Preview unavailable</p>
              </div>
            )}
          </div>

          {/* Audit warnings bar */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Quality & SEO Audit:</span>
            <div className="flex flex-wrap gap-1.5">
              {isMissingAlt ? (
                <Badge variant="warning" className="gap-1 text-[10px]">
                  <AlertTriangle className="w-3 h-3" /> Missing Alt Text
                </Badge>
              ) : (
                <Badge variant="success" className="gap-1 text-[10px]">
                  <CheckCircle2 className="w-3 h-3" /> Alt Text Configured
                </Badge>
              )}
              {isOversized && (
                <Badge variant="warning" className="gap-1 text-[10px]">
                  <AlertTriangle className="w-3 h-3" /> Oversized ({sizeKb} KB &gt; 500KB)
                </Badge>
              )}
              {isNonModern && (
                <Badge variant="neutral" className="gap-1 text-[10px]">
                  Legacy Format ({ext} vs WebP)
                </Badge>
              )}
            </div>
          </div>

          {/* Technical Specs */}
          <div className="p-3 rounded-lg bg-surface-2/40 border border-border text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-text-tertiary">Format:</span>
              <span className="font-semibold text-text-primary">{ext}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">File Size:</span>
              <span className="font-semibold text-text-primary">{sizeKb} KB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Dimensions:</span>
              <span className="font-semibold text-text-primary">
                {media.width && media.height ? `${media.width} × ${media.height} px` : 'Auto / Responsive'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Uploaded:</span>
              <span className="text-text-secondary">{new Date(media.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* URL Copy bar */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={media.url}
              readOnly
              className="flex-1 px-2.5 py-1 text-xs font-mono bg-surface-2 border border-border rounded text-text-secondary truncate"
            />
            <Button variant="outline" size="sm" onClick={handleCopyUrl} className="gap-1 text-xs">
              <Copy className="w-3 h-3" />
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Right: Metadata Editor */}
        <form onSubmit={handleSave} className="space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            {error && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Asset display title"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Alt Text <span className="text-text-tertiary font-normal">(Critical for SEO)</span>
              </label>
              <textarea
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                rows={3}
                placeholder="Describe image contents and context for accessibility and Google Image search..."
                className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Caption</label>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Optional visual caption"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Folder / Collection</label>
              <Input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="e.g. hero, team, products"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Asset
            </button>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={saving}>
                <Save className="w-3.5 h-3.5 mr-1" />
                {saving ? 'Saving...' : 'Save Metadata'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}
