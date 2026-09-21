'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  onCreated: (postId: string) => void;
}

export function CreatePostModal({ isOpen, onClose, websiteId, onCreated }: CreatePostModalProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug || slug === '/' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
      const generated = '/' + val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setSlug(generated);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/websites/${websiteId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug: slug.startsWith('/') ? slug : `/${slug}`,
          status: 'DRAFT',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        onCreated(json.data.post.id);
        onClose();
        setTitle('');
        setSlug('');
      } else {
        const json = await res.json();
        setError(json.error?.message || 'Failed to create article');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Blog Article"
      description="Start drafting a new post or article for your blog."
      maxWidth="md"
    >
      <form onSubmit={handleCreate} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">Article Title</label>
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. 10 Strategies to Scale Web Operations in 2026"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">URL Slug</label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. /10-strategies-to-scale"
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={loading || !title.trim()}>
            {loading ? 'Creating...' : 'Create & Open Editor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
