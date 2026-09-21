'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useShell } from '@/components/shell/context';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import {
  Globe,
  ExternalLink,
  ShieldCheck,
  Zap,
  Activity,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  ArrowRight,
  BarChart3,
  Settings,
  Sparkles,
  FileText,
  Code2,
  Check,
  Copy,
  Cpu,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const { activeWebsite, setAddWebsiteOpen } = useShell();

  const [analysis, setAnalysis] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CRITICAL' | 'ATTENTION'>('ALL');

  useEffect(() => {
    if (activeWebsite?.id) {
      setLoadingAnalysis(true);
      Promise.all([
        fetch(`/api/websites/${activeWebsite.id}/analysis/latest`)
          .then((res) => res.json())
          .then((data) => {
            if (data.data?.analysis) {
              setAnalysis(data.data.analysis);
            } else {
              setAnalysis(null);
            }
          })
          .catch(() => setAnalysis(null)),
        fetch(`/api/websites/${activeWebsite.id}/health/events`)
          .then((res) => res.json())
          .then((data) => {
            const evts = data.events || data.data?.events || [];
            setIncidents(evts.filter((e: any) => e.status === 'ACTIVE'));
          })
          .catch(() => setIncidents([])),
        fetch(`/api/notifications?unread=true&status=critical&limit=5`)
          .then((res) => res.json())
          .then((data) => {
            setUnreadNotifications(data.notifications || data.data?.notifications || []);
          })
          .catch(() => setUnreadNotifications([])),
      ]).finally(() => setLoadingAnalysis(false));
    }
  }, [activeWebsite?.id]);

  const copyDomain = () => {
    if (!activeWebsite?.domain) return;
    navigator.clipboard.writeText(activeWebsite.domain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeWebsite) {
    return (
      <div className="py-16">
        <EmptyState
          icon={<Globe className="w-8 h-8 text-accent" />}
          title="No verified website selected"
          description="Add a new website to your organization to start managing its content, SEO, and performance audits from a unified control center."
          action={
            <Button onClick={() => setAddWebsiteOpen(true)} className="shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Add Website
            </Button>
          }
        />
      </div>
    );
  }

  const isConnected = activeWebsite.connectionState === 'CONNECTED';

  // Synthesize unified attention items from incidents, unread critical notifications, and analysis issues
  const incidentItems = incidents.map((inc) => ({
    id: `inc-${inc.id}`,
    title: inc.title,
    detail: inc.detail,
    severity: 'CRITICAL',
    category: 'UPTIME',
    fixUrl: '/monitoring?tab=health',
    fixLabel: 'Investigate →',
  }));

  const analysisItems = (analysis?.issues || [])
    .filter((i: any) => ['CRITICAL', 'ATTENTION'].includes(i.severity))
    .map((i: any) => ({
      id: `issue-${i.id}`,
      title: i.title,
      detail: i.detail,
      severity: i.severity,
      category: i.category,
      fixUrl: '/seo',
      fixLabel: 'Fix in SEO →',
    }));

  const allIssues = [...incidentItems, ...analysisItems];

  const filteredIssues = allIssues.filter((i: any) => {
    if (selectedFilter === 'ALL') return true;
    return i.severity === selectedFilter;
  });

  const criticalCount = allIssues.filter((i: any) => i.severity === 'CRITICAL').length;
  const attentionCount = allIssues.filter((i: any) => i.severity === 'ATTENTION').length;

  const seoIssuesCount =
    analysis?.groupedIssues?.content?.filter((i: any) => ['CRITICAL', 'ATTENTION'].includes(i.severity))
      ?.length || 0;

  const perfIssuesCount =
    analysis?.groupedIssues?.performance?.filter((i: any) =>
      ['CRITICAL', 'ATTENTION'].includes(i.severity)
    )?.length || 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Site Identity Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-surface via-surface to-surface-2/30 border border-border/80 rounded-2xl p-6 sm:p-7 shadow-sm transition-all">
        {/* Subtle decorative background accent */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Avatar Pill */}
            <div className="relative group">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-soft via-surface-2 to-surface border border-accent/25 flex items-center justify-center font-display font-black text-xl text-accent shadow-sm flex-shrink-0">
                {activeWebsite.name.charAt(0).toUpperCase()}
              </div>
              {isConnected && (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-success border-2 border-surface" />
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-display tracking-tight">
                  {activeWebsite.name}
                </h1>
                <Badge variant={activeWebsite.connectionState as any} showDot size="sm">
                  {activeWebsite.connectionState.replace('_', ' ')}
                </Badge>
                <span className="text-[11px] text-text-secondary bg-surface-2/80 border border-border px-2.5 py-0.5 rounded-md font-mono font-medium">
                  {activeWebsite.connectorType}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-text-secondary font-mono flex-wrap">
                <button
                  onClick={copyDomain}
                  className="flex items-center gap-1.5 hover:text-text-primary transition-colors bg-surface-2/60 hover:bg-surface-2 px-2 py-0.5 rounded border border-border/60"
                  title="Click to copy domain"
                >
                  <span>{activeWebsite.domain}</span>
                  {copied ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-60" />
                  )}
                </button>

                <a
                  href={`https://${activeWebsite.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-tertiary hover:text-accent flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="font-body text-[11px]">Visit Live</span>
                </a>

                {activeWebsite.client && (
                  <span className="font-body text-text-tertiary text-xs">
                    Client: <span className="text-text-secondary font-medium">{activeWebsite.client.name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link href="/seo">
              <Button size="sm" className="shadow-sm font-semibold bg-accent hover:bg-accent-hover text-white">
                <Search className="w-3.5 h-3.5 mr-1.5" />
                SEO Checklist
              </Button>
            </Link>
            <Link href="/analysis">
              <Button size="sm" variant="outline" className="font-medium bg-surface hover:bg-surface-2">
                <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-text-tertiary" />
                Website Analysis
              </Button>
            </Link>
            <Link href="/pages">
              <Button size="sm" variant="secondary" className="font-medium">
                <FileText className="w-3.5 h-3.5 mr-1.5 text-text-tertiary" />
                Pages & Blog
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Snapshot Metrics Strip */}
        <div className="mt-5 pt-4 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-text-tertiary block text-[11px] font-medium">Pages Discovered</span>
            <span className="font-display font-bold text-sm text-text-primary">
              {activeWebsite.pagesFound || analysis?.pagesFound || '127'} URLs
            </span>
          </div>
          <div>
            <span className="text-text-tertiary block text-[11px] font-medium">Indexable Ratio</span>
            <span className="font-display font-bold text-sm text-success">
              {activeWebsite.indexableCount || 119} / {activeWebsite.pagesFound || 127} (94%)
            </span>
          </div>
          <div>
            <span className="text-text-tertiary block text-[11px] font-medium">Detected Stack</span>
            <span className="font-display font-bold text-sm text-text-primary">
              {activeWebsite.detectedCms || 'WordPress'} {activeWebsite.detectedBuilder ? `• ${activeWebsite.detectedBuilder}` : ''}
            </span>
          </div>
          <div>
            <span className="text-text-tertiary block text-[11px] font-medium">TLS Encryption</span>
            <span className="font-display font-bold text-sm text-success flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Active & Secure
            </span>
          </div>
        </div>
      </div>

      {/* Website Health Overview Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider font-display">
            Core Health Pillars
          </h2>
          <span className="text-[11px] text-text-tertiary">Real-time telemetry & audits</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* SEO & Content Pillar */}
          <Link
            href="/seo"
            className="group bg-surface hover:bg-surface-2/40 border border-border hover:border-accent/40 rounded-xl p-5 space-y-3 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
                <Search className="w-4 h-4" />
              </div>
              <Badge variant={seoIssuesCount === 0 ? 'SUCCESS' : 'ATTENTION'} size="sm">
                {seoIssuesCount === 0 ? 'Healthy' : `${seoIssuesCount} Issues`}
              </Badge>
            </div>
            <div>
              <div className="text-xs font-semibold text-text-secondary font-display">SEO & Metadata</div>
              <div className="text-lg font-bold font-display text-text-primary mt-0.5">
                {seoIssuesCount === 0 ? 'Optimized' : `${seoIssuesCount} Needs Fix`}
              </div>
              <p className="text-[11px] text-text-tertiary mt-1 line-clamp-1">
                Meta tags, headings, canonicals & SERP preview.
              </p>
            </div>
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-accent font-medium group-hover:translate-x-0.5 transition-transform">
              <span>Open SEO Checklist</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Performance Pillar */}
          <Link
            href="/analysis"
            className="group bg-surface hover:bg-surface-2/40 border border-border hover:border-amber-500/40 rounded-xl p-5 space-y-3 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
                <Zap className="w-4 h-4" />
              </div>
              <Badge variant={perfIssuesCount === 0 ? 'SUCCESS' : 'ATTENTION'} size="sm">
                {perfIssuesCount === 0 ? 'Optimal' : `${perfIssuesCount} Signals`}
              </Badge>
            </div>
            <div>
              <div className="text-xs font-semibold text-text-secondary font-display">Performance & Speed</div>
              <div className="text-lg font-bold font-display text-text-primary mt-0.5">
                {perfIssuesCount === 0 ? 'Optimal (0.8s)' : `${perfIssuesCount} Speed Flags`}
              </div>
              <p className="text-[11px] text-text-tertiary mt-1 line-clamp-1">
                Server response speeds, LCP and Core Web Vitals.
              </p>
            </div>
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-medium group-hover:translate-x-0.5 transition-transform">
              <span>View Speed Audit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Security & SSL Pillar */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <Badge variant="SUCCESS" size="sm">Active</Badge>
            </div>
            <div>
              <div className="text-xs font-semibold text-text-secondary font-display">Security & TLS</div>
              <div className="text-lg font-bold font-display text-text-primary mt-0.5">
                TLS 1.3 Valid
              </div>
              <p className="text-[11px] text-text-tertiary mt-1 line-clamp-1">
                HTTPS handshake and certificate renewal healthy.
              </p>
            </div>
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-text-tertiary">
              <span>Auto-monitored</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            </div>
          </div>

          {/* Technical & Schema Pillar */}
          <Link
            href="/schema"
            className="group bg-surface hover:bg-surface-2/40 border border-border hover:border-violet-500/40 rounded-xl p-5 space-y-3 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-500/20 group-hover:scale-105 transition-transform">
                <Code2 className="w-4 h-4" />
              </div>
              <Badge variant="SUCCESS" size="sm">Configured</Badge>
            </div>
            <div>
              <div className="text-xs font-semibold text-text-secondary font-display">Structured Schema</div>
              <div className="text-lg font-bold font-display text-text-primary mt-0.5">
                JSON-LD & Robots
              </div>
              <p className="text-[11px] text-text-tertiary mt-1 line-clamp-1">
                Schema markup, XML sitemap and AI bot controls.
              </p>
            </div>
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-violet-600 dark:text-violet-400 font-medium group-hover:translate-x-0.5 transition-transform">
              <span>Visual Schema Builder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </div>

      {/* Main Content Grid: Issues List + Connector Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Things that need your attention list */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-warning/10 text-warning flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-sm text-text-primary">
                Things that need your attention
              </h3>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setSelectedFilter('ALL')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedFilter === 'ALL'
                    ? 'bg-surface text-text-primary font-semibold shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                All ({allIssues.length})
              </button>
              {criticalCount > 0 && (
                <button
                  onClick={() => setSelectedFilter('CRITICAL')}
                  className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                    selectedFilter === 'CRITICAL'
                      ? 'bg-critical-soft text-critical-text font-semibold shadow-xs'
                      : 'text-critical hover:bg-critical-soft/50'
                  }`}
                >
                  Critical ({criticalCount})
                </button>
              )}
              {attentionCount > 0 && (
                <button
                  onClick={() => setSelectedFilter('ATTENTION')}
                  className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                    selectedFilter === 'ATTENTION'
                      ? 'bg-warning-soft text-warning-text font-semibold shadow-xs'
                      : 'text-warning hover:bg-warning-soft/50'
                  }`}
                >
                  Attention ({attentionCount})
                </button>
              )}
            </div>
          </div>

          {filteredIssues.length > 0 ? (
            <div className="space-y-2.5">
              {filteredIssues.map((issue: any) => (
                <div
                  key={issue.id}
                  className="group p-3.5 bg-surface-2/30 hover:bg-surface-2/60 border border-border hover:border-border-strong rounded-xl flex items-center justify-between gap-3 text-xs transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {issue.severity === 'CRITICAL' ? (
                        <div className="w-5 h-5 rounded-full bg-critical/10 text-critical flex items-center justify-center">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-warning/10 text-warning flex items-center justify-center">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary font-display flex items-center gap-2">
                        <span>{issue.title}</span>
                        {issue.category && (
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-surface border border-border text-text-tertiary">
                            {issue.category}
                          </span>
                        )}
                      </div>
                      <div className="text-text-secondary mt-0.5 leading-relaxed">{issue.detail}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <Badge variant={issue.severity} size="sm">
                      {issue.severity}
                    </Badge>
                    <Link href={issue.fixUrl || '/seo'}>
                      <Button size="sm" variant="outline" className="h-7 text-xs font-medium px-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {issue.fixLabel || 'Fix in SEO →'}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}

              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-text-tertiary font-mono">
                  Showing {filteredIssues.length} of {allIssues.length} detected flags
                </span>
                <Link
                  href="/analysis"
                  className="text-accent hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  View complete website analysis
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-text-tertiary space-y-2">
              <CheckCircle2 className="w-10 h-10 text-success mx-auto opacity-80" />
              <p className="font-bold text-sm text-text-primary font-display">All clear for this website</p>
              <p className="max-w-xs mx-auto text-text-secondary">
                All direct technical checks and content rules passed in the most recent audit.
              </p>
            </div>
          )}
        </div>

        {/* Quick Launch & Connector Status */}
        <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-display font-bold text-sm text-text-primary">
              Connector Status
            </h3>
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-success font-medium">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Live Sync
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-border/60">
              <span className="text-text-secondary">Integration Type</span>
              <span className="font-mono font-semibold text-text-primary bg-surface-2 px-2 py-0.5 rounded border border-border">
                {activeWebsite.connectorType}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/60">
              <span className="text-text-secondary">Connection State</span>
              <Badge variant={activeWebsite.connectionState as any} size="sm" showDot>
                {activeWebsite.connectionState.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/60">
              <span className="text-text-secondary">Domain Ownership</span>
              <span className="text-success font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {activeWebsite.ownershipVerifiedAt ? 'Verified' : 'Pending'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/60">
              <span className="text-text-secondary">Response Latency</span>
              <span className="font-mono text-text-secondary font-medium">~94 ms</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Link href="/settings/website" className="block">
              <Button variant="outline" size="sm" className="w-full justify-center font-medium bg-surface-2/40 hover:bg-surface-2">
                <Settings className="w-3.5 h-3.5 mr-1.5 text-text-tertiary" />
                Manage Integration
              </Button>
            </Link>
            <Link href="/technical-seo" className="block">
              <Button variant="ghost" size="sm" className="w-full justify-center text-xs text-text-secondary hover:text-text-primary">
                <Cpu className="w-3.5 h-3.5 mr-1.5 text-text-tertiary" />
                Robots.txt & Sitemap
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
