'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Plus, Trash2, Edit, Check, X, Twitter, Instagram, Linkedin } from 'lucide-react';

interface AuthorsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  onAuthorsUpdated?: () => void;
}

export function AuthorsDrawer({ isOpen, onClose, websiteId, onAuthorsUpdated }: AuthorsDrawerProps) {
  const [authors, setAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [bio, setBio] = useState('');
  const [xUrl, setXUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  const fetchAuthors = async () => {
    if (!websiteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/websites/${websiteId}/authors`);
      if (res.ok) {
        const json = await res.json();
        setAuthors(json.data.authors || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAuthors();
      setIsCreating(false);
      setEditingAuthor(null);
    }
  }, [isOpen, websiteId]);

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingAuthor(null);
    setName('');
    setRoleLabel('');
    setBio('');
    setXUrl('');
    setInstagramUrl('');
    setLinkedinUrl('');
  };

  const handleStartEdit = (author: any) => {
    setEditingAuthor(author);
    setIsCreating(false);
    setName(author.name);
    setRoleLabel(author.roleLabel || '');
    setBio(author.bio || '');
    setXUrl(author.xUrl || '');
    setInstagramUrl(author.instagramUrl || '');
    setLinkedinUrl(author.linkedinUrl || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingAuthor) {
        // PATCH
        const res = await fetch(`/api/websites/${websiteId}/authors/${editingAuthor.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            roleLabel: roleLabel || null,
            bio: bio || null,
            xUrl: xUrl || null,
            instagramUrl: instagramUrl || null,
            linkedinUrl: linkedinUrl || null,
          }),
        });
        if (res.ok) {
          setEditingAuthor(null);
          fetchAuthors();
          onAuthorsUpdated?.();
        }
      } else {
        // POST
        const res = await fetch(`/api/websites/${websiteId}/authors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            roleLabel: roleLabel || null,
            bio: bio || null,
            xUrl: xUrl || null,
            instagramUrl: instagramUrl || null,
            linkedinUrl: linkedinUrl || null,
          }),
        });
        if (res.ok) {
          setIsCreating(false);
          fetchAuthors();
          onAuthorsUpdated?.();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (authorId: string) => {
    if (!confirm('Are you sure you want to delete this author? Any associated posts will remain with author unlinked.')) return;
    try {
      const res = await fetch(`/api/websites/${websiteId}/authors/${authorId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchAuthors();
        onAuthorsUpdated?.();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Authors & Contributors" size="md">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-secondary">
            Manage author profiles and bylines linked to blog articles.
          </p>
          {!isCreating && !editingAuthor && (
            <Button variant="primary" size="sm" onClick={handleStartCreate} className="gap-1 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Author
            </Button>
          )}
        </div>

        {/* Create / Edit Form */}
        {(isCreating || editingAuthor) && (
          <form onSubmit={handleSave} className="p-4 rounded-xl border border-border bg-surface-2/40 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-text-primary font-display">
                {editingAuthor ? 'Edit Author Profile' : 'New Author Profile'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingAuthor(null);
                }}
                className="text-text-tertiary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Author Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Role / Title Label</label>
              <Input
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
                placeholder="e.g. Lead Technical Editor"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Short author biography"
                className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-text-tertiary mb-0.5">X (Twitter) URL</label>
                <Input
                  value={xUrl}
                  onChange={(e) => setXUrl(e.target.value)}
                  placeholder="https://x.com/..."
                />
              </div>
              <div>
                <label className="block text-[10px] text-text-tertiary mb-0.5">LinkedIn URL</label>
                <Input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/..."
                />
              </div>
              <div>
                <label className="block text-[10px] text-text-tertiary mb-0.5">Instagram URL</label>
                <Input
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreating(false);
                  setEditingAuthor(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={!name.trim()}>
                {editingAuthor ? 'Save Changes' : 'Create Author'}
              </Button>
            </div>
          </form>
        )}

        {/* Authors List */}
        <div className="space-y-3">
          {loading && authors.length === 0 ? (
            <div className="text-center py-8 text-xs text-text-tertiary">Loading authors...</div>
          ) : authors.length === 0 ? (
            <div className="p-8 text-center border border-border rounded-xl bg-surface text-xs text-text-tertiary">
              No authors created yet.
            </div>
          ) : (
            authors.map((a) => (
              <div key={a.id} className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand/10 text-brand font-bold text-xs flex items-center justify-center">
                    {a.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary">{a.name}</div>
                    <div className="text-[11px] text-text-tertiary">
                      {a.roleLabel || 'Author'} • {a._count?.posts || 0} posts
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartEdit(a)}
                    className="p-1.5 rounded-md hover:bg-surface-2 text-text-tertiary hover:text-text-primary"
                    title="Edit Author"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 rounded-md hover:bg-rose-500/10 text-text-tertiary hover:text-rose-500"
                    title="Delete Author"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Drawer>
  );
}
