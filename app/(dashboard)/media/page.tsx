'use client';

import React, { useState, useEffect } from 'react';
import { useShell } from '@/components/shell/context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { MediaUploadModal } from '@/components/media/media-upload-modal';
import { MediaDetailModal } from '@/components/media/media-detail-modal';
import {
  Image as ImageIcon,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  Folder,
  CheckCircle2,
  Grid,
  List,
  Filter,
  FileWarning
} from 'lucide-react';

export default function MediaPage() {
  const { activeWebsite, setAddWebsiteOpen } = useShell();

  const [loading, setLoading] = useState(true);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [auditFilter, setAuditFilter] = useState<'all' | 'missing_alt' | 'oversized' | 'non_modern'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

  const fetchMedia = async () => {
    if (!activeWebsite) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (auditFilter !== 'all') params.set('audit', auditFilter);

      const res = await fetch(`/api/websites/${activeWebsite.id}/media?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setMediaList(json.data.media || []);
        setStats(json.data.stats || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [activeWebsite?.id, searchQuery, auditFilter]);

  if (!activeWebsite) {
    return (
      <div className="p-8">
        <EmptyState
          icon={<ImageIcon className="w-6 h-6" />}
          title="No website selected"
          description="Select or add a website from the header to manage media assets and images."
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
            Media Library
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Asset management, dimensions, SEO alt text optimization, and formats for <span className="font-semibold text-text-primary">{activeWebsite.domain}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMedia}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setUploadModalOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Upload Asset
          </Button>
        </div>
      </div>

      {/* Audit Stats KPI Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-border bg-surface shadow-sm">
            <div className="text-[11px] font-semibold text-text-secondary">Total Media Assets</div>
            <div className="text-xl font-bold text-text-primary font-display mt-0.5">{stats.total}</div>
            <div className="text-[10px] text-text-tertiary mt-0.5">
              {(stats.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB stored
            </div>
          </div>

          <div
            onClick={() => setAuditFilter(auditFilter === 'missing_alt' ? 'all' : 'missing_alt')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all shadow-sm ${
              auditFilter === 'missing_alt'
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-border bg-surface hover:border-amber-500/40'
            }`}
          >
            <div className="text-[11px] font-semibold text-text-secondary flex items-center justify-between">
              <span>Missing Alt Text</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-600 font-display mt-0.5">{stats.missingAltCount}</div>
            <div className="text-[10px] text-text-tertiary mt-0.5">Needs SEO description</div>
          </div>

          <div
            onClick={() => setAuditFilter(auditFilter === 'oversized' ? 'all' : 'oversized')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all shadow-sm ${
              auditFilter === 'oversized'
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-border bg-surface hover:border-amber-500/40'
            }`}
          >
            <div className="text-[11px] font-semibold text-text-secondary flex items-center justify-between">
              <span>Oversized (&gt;500KB)</span>
              <FileWarning className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-600 font-display mt-0.5">{stats.oversizedCount}</div>
            <div className="text-[10px] text-text-tertiary mt-0.5">May slow page load</div>
          </div>

          <div
            onClick={() => setAuditFilter(auditFilter === 'non_modern' ? 'all' : 'non_modern')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all shadow-sm ${
              auditFilter === 'non_modern'
                ? 'border-brand bg-brand/10'
                : 'border-border bg-surface hover:border-brand/40'
            }`}
          >
            <div className="text-[11px] font-semibold text-text-secondary flex items-center justify-between">
              <span>Legacy Formats</span>
              <Filter className="w-3.5 h-3.5 text-brand" />
            </div>
            <div className="text-xl font-bold text-text-primary font-display mt-0.5">{stats.nonModernCount}</div>
            <div className="text-[10px] text-text-tertiary mt-0.5">Recommend WebP / AVIF</div>
          </div>
        </div>
      )}

      {/* Filter and View toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border bg-surface">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search media by filename, title, alt text..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-2 border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Audit Filter Pill */}
          <div className="flex items-center gap-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'missing_alt', label: 'Missing Alt' },
              { key: 'oversized', label: 'Oversized' },
              { key: 'non_modern', label: 'Legacy Formats' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setAuditFilter(f.key as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  auditFilter === f.key
                    ? 'bg-brand text-white font-semibold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border" />

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-surface-2 p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-surface text-brand shadow-xs' : 'text-text-tertiary'}`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1 rounded ${viewMode === 'table' ? 'bg-surface text-brand shadow-xs' : 'text-text-tertiary'}`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Media Body */}
      {loading && mediaList.length === 0 ? (
        <div className="p-12 text-center border border-border rounded-xl bg-surface">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto mb-3" />
          <p className="text-xs text-text-tertiary">Loading media library...</p>
        </div>
      ) : mediaList.length === 0 ? (
        <div className="p-12 text-center border border-border rounded-xl bg-surface">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 text-text-tertiary opacity-40" />
          <h3 className="text-sm font-semibold text-text-primary">No media assets found</h3>
          <p className="text-xs text-text-tertiary mt-1 max-w-sm mx-auto">
            {searchQuery || auditFilter !== 'all'
              ? 'No assets match the current search or audit filters.'
              : 'Upload images, banners, or icons to build your asset library.'}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setUploadModalOpen(true)}
            className="mt-4 gap-1.5"
          >
            <Plus className="w-4 h-4" /> Upload Asset
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {mediaList.map((m) => {
            const sizeKb = m.sizeBytes ? (m.sizeBytes / 1024).toFixed(0) : '—';
            return (
              <div
                key={m.id}
                onClick={() => setSelectedMedia(m)}
                className="group relative rounded-xl border border-border bg-surface hover:border-brand/50 transition-all overflow-hidden cursor-pointer shadow-sm flex flex-col"
              >
                {/* Thumbnail */}
                <div className="h-32 bg-surface-2 flex items-center justify-center overflow-hidden relative">
                  {m.url.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)($|\?)/i) || m.url.startsWith('/') ? (
                    <img
                      src={m.url}
                      alt={m.altText || m.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-text-tertiary opacity-40" />
                  )}

                  {/* Warning Badge on Thumbnail */}
                  {m.warnings?.missingAlt && (
                    <span
                      title="Missing Alt Text"
                      className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-surface animate-pulse"
                    />
                  )}
                </div>

                {/* Info Footer */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold text-text-primary truncate" title={m.title || m.filename}>
                      {m.title || m.filename}
                    </div>
                    <div className="text-[10px] text-text-tertiary truncate mt-0.5">
                      {m.folder ? `${m.folder}/` : ''}{m.filename}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-text-tertiary pt-2 border-t border-border/50 mt-2">
                    <span className="uppercase font-mono">{m.format}</span>
                    <span>{sizeKb} KB</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="border border-border rounded-xl bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-border text-text-secondary font-semibold">
                <tr>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Alt Text</th>
                  <th className="px-4 py-3">Folder</th>
                  <th className="px-4 py-3">Dimensions</th>
                  <th className="px-4 py-3">Format & Size</th>
                  <th className="px-4 py-3">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mediaList.map((m) => {
                  const sizeKb = m.sizeBytes ? (m.sizeBytes / 1024).toFixed(1) : '—';
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMedia(m)}
                      className="hover:bg-surface-2/40 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-2 border border-border shrink-0 flex items-center justify-center">
                            {m.url.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)($|\?)/i) || m.url.startsWith('/') ? (
                              <img src={m.url} alt={m.altText || m.title} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-text-tertiary" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-text-primary text-xs">{m.title || m.filename}</div>
                            <div className="font-mono text-[10px] text-text-tertiary truncate max-w-xs">{m.filename}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {m.altText ? (
                          <span className="text-xs text-text-secondary truncate max-w-xs block">{m.altText}</span>
                        ) : (
                          <Badge variant="warning" className="text-[10px] gap-1">
                            <AlertTriangle className="w-3 h-3" /> Missing
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {m.folder ? (
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <Folder className="w-3 h-3 text-text-tertiary" /> {m.folder}
                          </span>
                        ) : (
                          <span className="text-text-tertiary italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-tertiary text-xs">
                        {m.width && m.height ? `${m.width} × ${m.height}` : 'Auto'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="uppercase font-mono text-[10px] text-text-primary font-semibold">{m.format}</span>
                        <span className="text-text-tertiary text-[11px] ml-1.5">({sizeKb} KB)</span>
                      </td>
                      <td className="px-4 py-3 text-text-tertiary">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload and Detail Modals */}
      <MediaUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        websiteId={activeWebsite.id}
        onUploaded={fetchMedia}
      />

      {selectedMedia && (
        <MediaDetailModal
          isOpen={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
          media={selectedMedia}
          websiteId={activeWebsite.id}
          onUpdated={fetchMedia}
          onDeleted={fetchMedia}
        />
      )}
    </div>
  );
}
