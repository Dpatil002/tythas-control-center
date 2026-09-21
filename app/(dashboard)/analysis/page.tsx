'use client';

import React, { useState, useEffect } from 'react';
import { useShell } from '@/components/shell/context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Globe,
  RefreshCw,
  Clock,
  ShieldCheck,
  Zap,
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Plus,
} from 'lucide-react';

export default function WebsiteAnalysisPage() {
  const { activeWebsite, setAddWebsiteOpen } = useShell();

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isReRunning, setIsReRunning] = useState(false);
  const [reRunError, setReRunError] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    technical: true,
    performance: true,
    content: true,
  });

  const fetchLatestAnalysis = async () => {
    if (!activeWebsite) return;
    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/analysis/latest`);
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.data?.analysis);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLatestAnalysis();
  }, [activeWebsite?.id]);

  // Handle re-run analysis
  const handleReRun = async () => {
    if (!activeWebsite) return;
    setIsReRunning(true);
    setReRunError(null);

    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/analysis`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to trigger re-run analysis.');
      }

      // Poll until analysis completes
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const checkRes = await fetch(`/api/websites/${activeWebsite.id}/analysis/latest`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          const latest = checkData.data?.analysis;
          setAnalysis(latest);
          if (latest?.status === 'COMPLETE' || latest?.status === 'FAILED' || attempts > 20) {
            clearInterval(interval);
            setIsReRunning(false);
          }
        }
      }, 1500);
    } catch (err: any) {
      setReRunError(err.message);
      setIsReRunning(false);
    }
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!activeWebsite) {
    return (
      <div className="py-12">
        <EmptyState
          icon={<Globe className="w-6 h-6" />}
          title="No verified website selected"
          description="Select or add a verified website to view its technical, performance, and SEO health."
          action={
            <Button onClick={() => setAddWebsiteOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Website
            </Button>
          }
        />
      </div>
    );
  }

  // Calculate freshness string
  const getFreshness = () => {
    if (!analysis?.completedAt) return 'Pending first crawl';
    const diffMs = Date.now() - new Date(analysis.completedAt).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Periodic check · last run just now';
    if (diffMins === 1) return 'Periodic check · last run 1 minute ago';
    if (diffMins < 60) return `Periodic check · last run ${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `Periodic check · last run ${diffHours} hour(s) ago`;
  };

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <AlertCircle className="w-4 h-4 text-critical flex-shrink-0" />;
      case 'ATTENTION':
        return <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />;
      case 'HEALTHY':
        return <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />;
      default:
        return <HelpCircle className="w-4 h-4 text-text-tertiary flex-shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-surface border border-border rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-text-primary font-display">
              Website Analysis
            </h1>
            <Badge variant={activeWebsite.connectionState as any} size="sm" showDot>
              {activeWebsite.connectionState.replace('_', ' ')}
            </Badge>
            <span className="text-xs text-text-tertiary font-mono bg-surface-2 px-2 py-0.5 rounded">
              {activeWebsite.domain}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary mt-1 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>{getFreshness()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReRun}
            isLoading={isReRunning}
            disabled={isReRunning}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isReRunning ? 'animate-spin' : ''}`} />
            Re-run analysis
          </Button>
        </div>
      </div>

      {reRunError && (
        <div className="p-3.5 bg-warning-soft text-warning-text text-xs rounded-lg border border-warning-soft flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{reRunError}</span>
          </div>
          <button
            onClick={() => setReRunError(null)}
            className="text-xs text-warning-text hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Stat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-lg p-4 space-y-1">
          <div className="text-xs text-text-tertiary font-medium">Pages Crawled</div>
          <div className="text-2xl font-bold font-display text-text-primary">
            {analysis?.pagesFound ?? 0}
          </div>
          <div className="text-[11px] text-text-secondary">
            {analysis?.indexableCount ?? 0} indexable
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-4 space-y-1">
          <div className="text-xs text-text-tertiary font-medium">Technical Audits</div>
          <div className="text-2xl font-bold font-display text-text-primary">
            {analysis?.groupedIssues?.technical?.filter((i: any) => i.severity === 'HEALTHY').length || 0} /{' '}
            {analysis?.groupedIssues?.technical?.length || 0}
          </div>
          <div className="text-[11px] text-text-secondary">Direct verification passed</div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-4 space-y-1">
          <div className="text-xs text-text-tertiary font-medium">Performance Signals</div>
          <div className="text-2xl font-bold font-display text-text-primary">
            {analysis?.groupedIssues?.performance?.filter((i: any) => i.severity === 'HEALTHY').length || 0} Healthy
          </div>
          <div className="text-[11px] text-text-secondary">Speed & CWV metrics</div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-4 space-y-1">
          <div className="text-xs text-text-tertiary font-medium">Content Recommendations</div>
          <div className="text-2xl font-bold font-display text-text-primary">
            {analysis?.groupedIssues?.content?.filter((i: any) => ['CRITICAL', 'ATTENTION'].includes(i.severity)).length || 0} Suggestions
          </div>
          <div className="text-[11px] text-text-secondary">Titles, metadata & headings</div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. TECHNICAL CHECKS GROUP (what we can verify directly) */}
      {/* ========================================================= */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
        <button
          onClick={() => toggleGroup('technical')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-2/40 transition-colors border-b border-border"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-accent-soft text-accent">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-sm text-text-primary">
                  Technical Architecture
                </h2>
                <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded bg-surface-2 text-text-secondary border border-border">
                  Verified Directly
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-0.5">
                Direct verification of server responses, SSL certificates, crawling directives, and indexing.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-text-tertiary">
            <span className="text-xs font-mono">
              {analysis?.groupedIssues?.technical?.length || 0} checks
            </span>
            {openGroups.technical ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {openGroups.technical && (
          <div className="divide-y divide-border">
            {analysis?.groupedIssues?.technical?.map((check: any) => (
              <div
                key={check.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-2/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getSeverityIcon(check.severity)}</div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary font-display">
                      {check.title}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">{check.detail}</div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Badge variant={check.severity} size="sm">
                    {check.severity.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. PERFORMANCE CHECKS GROUP */}
      {/* ========================================================= */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
        <button
          onClick={() => toggleGroup('performance')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-2/40 transition-colors border-b border-border"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-warning-soft text-warning">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-sm text-text-primary">
                  Performance & Core Web Vitals
                </h2>
                <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded bg-surface-2 text-text-secondary border border-border">
                  Signal Source
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-0.5">
                Server response speeds, Chrome UX report field data, and uncompressed media detection.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-text-tertiary">
            <span className="text-xs font-mono">
              {analysis?.groupedIssues?.performance?.length || 0} checks
            </span>
            {openGroups.performance ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {openGroups.performance && (
          <div className="divide-y divide-border">
            {analysis?.groupedIssues?.performance?.map((check: any) => (
              <div
                key={check.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-2/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getSeverityIcon(check.severity)}</div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary font-display">
                      {check.title}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">{check.detail}</div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Badge variant={check.severity} size="sm">
                    {check.severity.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. CONTENT CHECKS GROUP (best-practice recommendations) */}
      {/* ========================================================= */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
        <button
          onClick={() => toggleGroup('content')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-2/40 transition-colors border-b border-border"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-accent-soft text-accent">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-sm text-text-primary">
                  Content & Metadata Health
                </h2>
                <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded bg-surface-2 text-text-secondary border border-border">
                  Best-Practice Recommendations
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-0.5">
                Guidance on title tags, meta descriptions, heading hierarchy, image alt text, and thin content.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-text-tertiary">
            <span className="text-xs font-mono">
              {analysis?.groupedIssues?.content?.length || 0} checks
            </span>
            {openGroups.content ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {openGroups.content && (
          <div className="divide-y divide-border">
            {analysis?.groupedIssues?.content?.map((check: any) => (
              <div
                key={check.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-2/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getSeverityIcon(check.severity)}</div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary font-display">
                      {check.title}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">{check.detail}</div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Badge variant={check.severity} size="sm">
                    {check.severity.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
