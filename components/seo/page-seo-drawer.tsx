'use client';

import React, { useState, useEffect } from 'react';
import { X, Globe, AlertTriangle, CheckCircle2, Search, Sparkles, ExternalLink } from 'lucide-react';

interface PageSeoDrawerProps {
  websiteId: string;
  websiteDomain: string;
  item: {
    id: string;
    type: 'page' | 'post';
    title: string;
    slug: string;
    urlPath: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const PageSeoDrawer: React.FC<PageSeoDrawerProps> = ({
  websiteId,
  websiteDomain,
  item,
  isOpen,
  onClose,
  onSaved
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [initialSlug, setInitialSlug] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [h1, setH1] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [robotsDirective, setRobotsDirective] = useState<'INDEX_FOLLOW' | 'NOINDEX_FOLLOW' | 'NOINDEX_NOFOLLOW'>('INDEX_FOLLOW');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [ogTitle, setOgTitle] = useState('');
  const [ogDescription, setOgDescription] = useState('');
  const [createRedirect, setCreateRedirect] = useState(true);

  useEffect(() => {
    if (!isOpen || !item) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const endpoint =
      item.type === 'page'
        ? `/api/websites/${websiteId}/pages/${item.id}/seo`
        : `/api/websites/${websiteId}/posts/${item.id}/seo`;

    fetch(endpoint)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          setTitle(d.title || '');
          setSlug(d.slug || '');
          setInitialSlug(d.slug || '');
          setStatus(d.status || 'DRAFT');
          setSeoTitle(d.seoTitle || '');
          setSeoDescription(d.seoDescription || '');
          setH1(d.h1 || '');
          setCanonicalUrl(d.canonicalUrl || '');
          setRobotsDirective(d.robotsDirective || 'INDEX_FOLLOW');
          setFocusKeyword(d.focusKeyword || '');
          setSecondaryKeywords((d.secondaryKeywords || []).join(', '));
          setOgTitle(d.ogTitle || '');
          setOgDescription(d.ogDescription || '');
        }
      })
      .catch((err) => setError('Failed to load SEO fields: ' + err.message))
      .finally(() => setLoading(false));
  }, [isOpen, item, websiteId]);

  if (!isOpen || !item) return null;

  const displayTitle = seoTitle.trim() || title.trim() || 'Untitled Page';
  const displayDescription =
    seoDescription.trim() ||
    'Provide a meta description to control what potential visitors see when this page appears in Google search results.';
  const rawDomain = websiteDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const displayUrl = `https://${rawDomain}/${slug.replace(/^\/+/, '')}`;

  const isSlugChanged = slug.trim() !== initialSlug.trim() && slug.trim().length > 0;
  const isPublished = status === 'PUBLISHED';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const endpoint =
      item.type === 'page'
        ? `/api/websites/${websiteId}/pages/${item.id}/seo`
        : `/api/websites/${websiteId}/posts/${item.id}/seo`;

    const secKeywordsList = secondaryKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
          h1: h1 || null,
          canonicalUrl: canonicalUrl || null,
          robotsDirective,
          focusKeyword: focusKeyword || null,
          secondaryKeywords: secKeywordsList,
          ogTitle: ogTitle || null,
          ogDescription: ogDescription || null,
          slug: slug || undefined,
          createRedirect: isSlugChanged && isPublished ? createRedirect : false
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save SEO fields');
      }

      setSuccessMsg(
        data.data?.redirectCreated
          ? 'SEO metadata saved & 301 redirect created!'
          : 'SEO metadata saved successfully!'
      );
      setInitialSlug(slug);

      if (onSaved) onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-surface border-l border-border h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-accent/10 text-accent font-semibold">
                {item.type === 'page' ? 'Page SEO' : 'Blog Post SEO'}
              </span>
              <span className="text-xs text-text-muted font-mono">ID: {item.id}</span>
            </div>
            <h2 className="text-base font-display font-bold text-text-primary mt-1 truncate max-w-md">
              {title || 'SEO Metadata Panel'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center text-text-muted space-y-3">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono">Loading SEO metadata...</p>
            </div>
          ) : (
            <form id="seo-form" onSubmit={handleSave} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Live Google SERP Snippet Preview */}
              <div className="p-4 rounded-xl bg-surface-hover/40 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs text-text-muted font-mono">
                  <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                    <GoogleIcon className="w-3.5 h-3.5" />
                    <span>Search Result Preview</span>
                  </div>
                  <span>Google Desktop Preview</span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#ffffff] dark:bg-[#1f1f1f] text-[#202124] dark:text-[#e8eaed] space-y-1 shadow-sm font-sans">
                  <div className="flex items-center gap-2 text-xs text-[#4d5156] dark:text-[#bdc1c6] truncate">
                    <Globe className="w-3.5 h-3.5 flex-shrink-0 text-[#202124] dark:text-[#bdc1c6]" />
                    <span className="truncate">{displayUrl}</span>
                  </div>
                  <h3 className="text-sm font-medium text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer truncate">
                    {displayTitle}
                  </h3>
                  <p className="text-xs text-[#4d5156] dark:text-[#bdc1c6] line-clamp-2 leading-relaxed">
                    {displayDescription}
                  </p>
                </div>
              </div>

              {/* Field: SEO Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-text-primary">SEO Title Tag</label>
                  <span
                    className={`font-mono text-[11px] ${
                      seoTitle.length > 60 ? 'text-amber-400 font-semibold' : 'text-text-muted'
                    }`}
                  >
                    {seoTitle.length} / 60 characters
                  </span>
                </div>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={title || 'e.g. Luxury Skincare Routine for Glowing Skin | Brand'}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
                />
                <p className="text-[11px] text-text-muted">
                  The clickable title that appears in Google search result headers.
                </p>
              </div>

              {/* Field: Meta Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-text-primary">Meta Description</label>
                  <span
                    className={`font-mono text-[11px] ${
                      seoDescription.length > 155 ? 'text-amber-400 font-semibold' : 'text-text-muted'
                    }`}
                  >
                    {seoDescription.length} / 155 characters
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Summarize the page content for searchers..."
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
                />
                <p className="text-[11px] text-text-muted">
                  Shown in the snippet preview below the title. Keep between 120-155 characters.
                </p>
              </div>

              {/* Grid: Primary H1 & Canonical URL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-primary">Primary H1 Heading</label>
                  <input
                    type="text"
                    value={h1}
                    onChange={(e) => setH1(e.target.value)}
                    placeholder={title || 'Main Page Heading'}
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-primary">Canonical URL</label>
                  <input
                    type="text"
                    value={canonicalUrl}
                    onChange={(e) => setCanonicalUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Robots Directives */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-primary">Search Engine Indexing Directive</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'INDEX_FOLLOW', label: 'Index, Follow', desc: 'Default (Index & pass rank)' },
                    { id: 'NOINDEX_FOLLOW', label: 'Noindex, Follow', desc: 'Hide from search, follow links' },
                    { id: 'NOINDEX_NOFOLLOW', label: 'Noindex, Nofollow', desc: 'Block completely' }
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setRobotsDirective(opt.id as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        robotsDirective === opt.id
                          ? 'bg-accent/10 border-accent text-accent'
                          : 'bg-surface-hover border-border text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <div className="font-semibold text-xs">{opt.label}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Keywords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-primary">Focus Keyword</label>
                  <input
                    type="text"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    placeholder="e.g. facial serum"
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-primary">Secondary Keywords</label>
                  <input
                    type="text"
                    value={secondaryKeywords}
                    onChange={(e) => setSecondaryKeywords(e.target.value)}
                    placeholder="skin hydration, anti aging, hyaluronic"
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Slug Modification & 301 Auto-Redirect */}
              <div className="p-4 rounded-xl bg-surface-hover/30 border border-border space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-primary">URL Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="page-url-slug"
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
                  />
                </div>

                {isSlugChanged && isPublished && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2">
                    <div className="flex items-start gap-2 text-xs text-amber-400">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Published URL Slug Changed</span>
                        <p className="text-[11px] text-amber-400/80 mt-0.5">
                          Changing the URL of a published page can break existing bookmarks and search rankings.
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={createRedirect}
                        onChange={(e) => setCreateRedirect(e.target.checked)}
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      <span>
                        Automatically create 301 redirect: <code className="font-mono text-[10px]">/{initialSlug}</code> →{' '}
                        <code className="font-mono text-[10px]">/{slug}</code>
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* OpenGraph & Social Sharing Meta */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
                    Social Sharing (OpenGraph)
                  </span>
                  <span className="text-[11px] text-text-muted">Defaults to SEO title/desc if blank</span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-primary">OG Title</label>
                    <input
                      type="text"
                      value={ogTitle}
                      onChange={(e) => setOgTitle(e.target.value)}
                      placeholder={seoTitle || title || 'OpenGraph title for social cards'}
                      className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-primary">OG Description</label>
                    <textarea
                      rows={2}
                      value={ogDescription}
                      onChange={(e) => setOgDescription(e.target.value)}
                      placeholder={seoDescription || 'Description for Facebook, LinkedIn, X cards'}
                      className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-surface-hover/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>

          <button
            form="seo-form"
            type="submit"
            disabled={saving || loading}
            className="px-5 py-2 rounded-lg bg-accent text-white font-medium text-xs shadow-md hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save SEO Metadata</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}
