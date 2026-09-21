'use client';

import React, { useState, useEffect } from 'react';
import { useShell } from '@/components/shell/context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSeoDrawer } from '@/components/seo/page-seo-drawer';
import {
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  Filter,
  Globe,
  FileText,
  BookOpen,
  Layers,
  ChevronDown,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function SeoChecklistPage() {
  const { activeWebsite, setAddWebsiteOpen } = useShell();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CONTENT' | 'STRUCTURE' | 'TECHNICAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedChecks, setExpandedChecks] = useState<Record<string, boolean>>({});

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    type: 'page' | 'post';
    title: string;
    slug: string;
    urlPath: string;
  } | null>(null);

  const fetchChecklist = async () => {
    if (!activeWebsite) return;
    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/seo/checklist`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
        // Expand checks that have critical or attention issues by default
        const initialOpen: Record<string, boolean> = {};
        json.data?.items?.forEach((i: any) => {
          if (i.severity !== 'HEALTHY') initialOpen[i.id] = true;
        });
        setExpandedChecks(initialOpen);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchChecklist();
  }, [activeWebsite?.id]);

  if (!activeWebsite) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <EmptyState
          icon={<Globe className="w-6 h-6" />}
          title="No website selected"
          description="Select or add a website to view and manage its SEO checklist."
          actionLabel="+ Add Website"
          onAction={() => setAddWebsiteOpen(true)}
        />
      </div>
    );
  }

  const items = (data?.items || []).filter((item: any) => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDetail = item.detail.toLowerCase().includes(q);
      const matchPage = item.affectedItems?.some((p: any) =>
        p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      );
      return matchTitle || matchDetail || matchPage;
    }
    return true;
  });

  const toggleCheck = (id: string) => {
    setExpandedChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenFix = (affected: any) => {
    setSelectedItem(affected);
    setDrawerOpen(true);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-text-primary tracking-tight">
              SEO Checklist
            </h1>
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-surface-hover text-text-muted border border-border">
              {data?.source === 'cms_realtime' ? '⚡ Live CMS Audit' : 'Public Crawl Fallback'}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 font-sans">
            Sitewide diagnostics for titles, descriptions, headings, indexability, and structured metadata.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchChecklist();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Checklist</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-sm space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-red-400 font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Critical Issues</span>
          </div>
          <div className="text-2xl font-bold font-display text-text-primary">
            {data?.summary?.criticalCount ?? 0}
          </div>
          <div className="text-[11px] text-text-muted">Missing essential title tags</div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-sm space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Needs Attention</span>
          </div>
          <div className="text-2xl font-bold font-display text-text-primary">
            {data?.summary?.attentionCount ?? 0}
          </div>
          <div className="text-[11px] text-text-muted">Descriptions, length, H1 tags</div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-sm space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Healthy Checks</span>
          </div>
          <div className="text-2xl font-bold font-display text-text-primary">
            {data?.summary?.healthyCount ?? 0}
          </div>
          <div className="text-[11px] text-text-muted">Passing technical standards</div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-sm space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Content Audited</span>
          </div>
          <div className="text-2xl font-bold font-display text-text-primary">
            {data?.summary?.totalPagesAudited ?? 0}
          </div>
          <div className="text-[11px] text-text-muted">Pages and blog posts checked</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-border">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'CONTENT', 'STRUCTURE', 'TECHNICAL'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                categoryFilter === cat
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              {cat === 'ALL' ? 'All Checks' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search checks or pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Checklist Accordion */}
      {loading ? (
        <div className="py-20 text-center text-text-muted space-y-3">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Running live SEO checks...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-surface rounded-xl border border-border text-text-muted space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="font-semibold text-sm text-text-primary">No issues found</h3>
          <p className="text-xs max-w-sm mx-auto">
            All audited checks match the current filter criteria and adhere to SEO best practices.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((check: any) => {
            const isExpanded = !!expandedChecks[check.id];
            const isCritical = check.severity === 'CRITICAL';
            const isAttention = check.severity === 'ATTENTION';
            const isHealthy = check.severity === 'HEALTHY';

            return (
              <div
                key={check.id}
                className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm transition-all"
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleCheck(check.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface-hover/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button className="p-0.5 text-text-muted hover:text-text-primary">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      {isCritical ? (
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      ) : isAttention ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      )}
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">{check.title}</h3>
                        <p className="text-xs text-text-muted mt-0.5">{check.detail}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-text-muted hidden sm:inline-block">
                      {check.category}
                    </span>

                    {check.affectedCount > 0 ? (
                      <Badge
                        variant={isCritical ? 'critical' : 'warning'}
                        size="sm"
                        className="font-mono text-[10px]"
                      >
                        {check.affectedCount} Affected
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm" className="font-mono text-[10px]">
                        Passing
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Expanded Affected Items Table */}
                {isExpanded && check.affectedItems && check.affectedItems.length > 0 && (
                  <div className="border-t border-border bg-surface-hover/20 p-4 space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted px-2 font-semibold">
                      Affected Content Items ({check.affectedItems.length})
                    </div>
                    <div className="divide-y divide-border/60 rounded-lg border border-border/80 bg-surface overflow-hidden">
                      {check.affectedItems.map((item: any) => (
                        <div
                          key={item.id}
                          className="p-3 flex items-center justify-between text-xs hover:bg-surface-hover/40 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.type === 'page' ? (
                              <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
                            ) : (
                              <BookOpen className="w-4 h-4 text-text-muted flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-text-primary truncate">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-text-muted font-mono truncate">
                                {item.urlPath}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            {item.issueHint && (
                              <span className="text-[11px] text-amber-400 font-mono hidden md:inline-block max-w-[200px] truncate">
                                {item.issueHint}
                              </span>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenFix(item);
                              }}
                              className="text-xs h-7 px-2.5 text-accent border-accent/30 hover:bg-accent/10 flex items-center gap-1"
                            >
                              <span>Fix</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SEO Drawer */}
      <PageSeoDrawer
        websiteId={activeWebsite.id}
        websiteDomain={activeWebsite.domain}
        item={selectedItem}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          fetchChecklist();
        }}
      />
    </div>
  );
}
