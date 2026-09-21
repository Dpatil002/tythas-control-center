'use client';

import React, { useState, useEffect } from 'react';
import { useShell } from '@/components/shell/context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { BlogEditorModal } from '@/components/blog/blog-editor-modal';
import { CreatePostModal } from '@/components/blog/create-post-modal';
import { AuthorsDrawer } from '@/components/blog/authors-drawer';
import { PageSeoDrawer } from '@/components/seo/page-seo-drawer';
import {
  BookOpen,
  Search,
  Plus,
  Edit,
  Globe,
  Send,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Calendar,
  User,
  Users
} from 'lucide-react';

export default function BlogPage() {
  const { activeWebsite, setAddWebsiteOpen } = useShell();

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [authorsDrawerOpen, setAuthorsDrawerOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // SEO Drawer
  const [seoDrawerOpen, setSeoDrawerOpen] = useState(false);
  const [seoTargetItem, setSeoTargetItem] = useState<{
    id: string;
    type: 'page' | 'post';
    title: string;
    slug: string;
    urlPath: string;
  } | null>(null);

  const isAuditOnly = activeWebsite?.connectionState === 'AUDIT_ONLY' || activeWebsite?.connectionState === 'DISCONNECTED';

  const fetchPosts = async () => {
    if (!activeWebsite) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/websites/${activeWebsite.id}/posts?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setPosts(json.data?.posts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeWebsite?.id, searchQuery, statusFilter]);

  const handleDeletePost = async (postId: string, postTitle: string) => {
    if (!confirm(`Are you sure you want to delete article "${postTitle}"?`)) return;
    try {
      const res = await fetch(`/api/websites/${activeWebsite?.id}/posts/${postId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchPosts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeWebsite) {
    return (
      <div className="p-8">
        <EmptyState
          icon={<BookOpen className="w-6 h-6" />}
          title="No website selected"
          description="Select or connect a website from the header to manage blog posts and articles."
          actionLabel="Add Website"
          onAction={() => setAddWebsiteOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight font-display">
            Blog & Articles
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Authoring, scheduling, rich FAQ blocks, and publishing for <span className="font-semibold text-text-primary">{activeWebsite.domain}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAuthorsDrawerOpen(true)}
            className="gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            Authors
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPosts}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Post
          </Button>
        </div>
      </div>

      {/* Audit-Only Capability Banner */}
      {isAuditOnly && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-semibold">Audit Only Mode:</span> This website is in read-only audit mode. Blog drafts can be saved locally, but live sync and publishing are disabled.
            </div>
          </div>
          <Badge variant="warning" className="shrink-0 ml-2">Read-Only</Badge>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border bg-surface">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles by title or slug..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-2 border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {['ALL', 'PUBLISHED', 'DRAFT', 'SCHEDULED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-brand text-white font-semibold shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
              }`}
            >
              {st === 'ALL' ? 'All Posts' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Posts List */}
      {loading && posts.length === 0 ? (
        <div className="p-12 text-center border border-border rounded-xl bg-surface">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto mb-3" />
          <p className="text-xs text-text-tertiary">Loading articles...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 text-center border border-border rounded-xl bg-surface">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-text-tertiary opacity-40" />
          <h3 className="text-sm font-semibold text-text-primary">No articles found</h3>
          <p className="text-xs text-text-tertiary mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No articles matching "${searchQuery}".`
              : 'Write your first blog post with rich text and FAQ blocks.'}
          </p>
          {!searchQuery && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="mt-4 gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create First Post
            </Button>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-xl bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-border text-text-secondary font-semibold">
                <tr>
                  <th className="px-4 py-3">Article & Slug</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">SEO / Meta</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {posts.map((p) => {
                  const hasMeta = !!(p.seoTitle && p.seoDescription);
                  return (
                    <tr key={p.id} className="hover:bg-surface-2/30 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text-primary text-sm font-display flex items-center gap-1.5">
                          {p.title}
                        </div>
                        <div className="font-mono text-[11px] text-text-tertiary mt-0.5">
                          {p.slug}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.author ? (
                          <div className="flex items-center gap-1.5 text-text-secondary">
                            <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-[10px] font-bold flex items-center justify-center">
                              {p.author.name.charAt(0)}
                            </span>
                            <span>{p.author.name}</span>
                          </div>
                        ) : (
                          <span className="text-text-tertiary italic">No author</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            p.status === 'PUBLISHED'
                              ? 'success'
                              : p.status === 'SCHEDULED'
                              ? 'info'
                              : 'warning'
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSeoTargetItem({
                              id: p.id,
                              type: 'post',
                              title: p.title,
                              slug: p.slug,
                              urlPath: p.slug,
                            });
                            setSeoDrawerOpen(true);
                          }}
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                            hasMeta
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                        >
                          <Globe className="w-3 h-3" />
                          {hasMeta ? 'Optimized' : 'Needs Meta'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-text-tertiary">
                        {p.scheduledAt ? (
                          <div className="flex items-center gap-1 text-purple-600">
                            <Calendar className="w-3 h-3" />
                            {new Date(p.scheduledAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(p.updatedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedPostId(p.id);
                              setEditorModalOpen(true);
                            }}
                            className="gap-1 text-xs py-1 px-2.5"
                          >
                            <Edit className="w-3 h-3" /> Edit Article
                          </Button>
                          <button
                            onClick={() => handleDeletePost(p.id, p.title)}
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Delete Post"
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
        </div>
      )}

      {/* Modals & Drawers */}
      <CreatePostModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        websiteId={activeWebsite.id}
        onCreated={(newPostId) => {
          fetchPosts();
          setSelectedPostId(newPostId);
          setEditorModalOpen(true);
        }}
      />

      {selectedPostId && (
        <BlogEditorModal
          isOpen={editorModalOpen}
          onClose={() => {
            setEditorModalOpen(false);
            setSelectedPostId(null);
          }}
          postId={selectedPostId}
          websiteId={activeWebsite.id}
          websiteDomain={activeWebsite.domain}
          canWrite={!isAuditOnly}
          onSaved={fetchPosts}
        />
      )}

      <AuthorsDrawer
        isOpen={authorsDrawerOpen}
        onClose={() => setAuthorsDrawerOpen(false)}
        websiteId={activeWebsite.id}
        onAuthorsUpdated={fetchPosts}
      />

      {seoTargetItem && (
        <PageSeoDrawer
          isOpen={seoDrawerOpen}
          onClose={() => {
            setSeoDrawerOpen(false);
            setSeoTargetItem(null);
          }}
          websiteId={activeWebsite.id}
          websiteDomain={activeWebsite.domain}
          item={seoTargetItem}
          onSaved={fetchPosts}
        />
      )}
    </div>
  );
}
