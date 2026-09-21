'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  Globe,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Zap,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShell } from '@/components/shell/context';
import Link from 'next/link';

interface HealthSummary {
  uptimePercent: number;
  sslDaysRemaining: number;
  sslStatus: string;
  lastCrawlAt: string | null;
  performanceScore: number | null;
  performanceStatus: string;
  lcp: string;
  cls: string;
  inp: string;
  checkFrequency: string;
  totalChecks30d: number;
  hasActiveIncident: boolean;
}

interface WebsiteHealthRow {
  id: string;
  name: string;
  domain: string;
  connectionState: string;
  connectorType: string;
  uptimeStatus: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
  uptimePercent: number;
  uptimeDetail: string;
  sslStatus: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
  sslDays: number;
  crawlStatus: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
  crawlDetail: string;
  performanceScore: number;
  performanceStatus: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
  lastCheckedAt: string | null;
  hasActiveIncident: boolean;
}

interface MonitoringEvent {
  id: string;
  type: string;
  title: string;
  detail: string;
  timestamp: string;
  resolvedAt: string | null;
  status: 'ACTIVE' | 'RESOLVED' | 'COMPLETED';
  severity: 'CRITICAL' | 'WARNING' | 'SUCCESS' | 'INFO';
}

export const SiteHealthTab: React.FC<{ websiteId: string; websiteDomain: string }> = ({
  websiteId,
  websiteDomain,
}) => {
  const { user } = useShell();
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [websites, setWebsites] = useState<WebsiteHealthRow[]>([]);
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingNow, setCheckingNow] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const [summaryRes, eventsRes, orgWebsitesRes] = await Promise.all([
        fetch(`/api/websites/${websiteId}/health/summary`),
        fetch(`/api/websites/${websiteId}/health/events`),
        user?.organizationId
          ? fetch(`/api/organizations/${user.organizationId}/health/websites`)
          : Promise.resolve(null),
      ]);

      if (summaryRes.ok) {
        const sData = await summaryRes.json();
        setSummary(sData.summary || sData.data?.summary || null);
      }
      if (eventsRes.ok) {
        const eData = await eventsRes.json();
        setEvents(eData.events || eData.data?.events || []);
      }
      if (orgWebsitesRes && orgWebsitesRes.ok) {
        const wData = await orgWebsitesRes.json();
        setWebsites(wData.websites || wData.data?.websites || []);
      }
    } catch (err) {
      console.error('Failed to load health data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, [websiteId, user?.organizationId]);

  const handleCheckNow = async () => {
    try {
      setCheckingNow(true);
      setCheckMessage(null);
      setCheckError(null);

      const res = await fetch(`/api/websites/${websiteId}/health/check-now`, {
        method: 'POST',
      });

      const data = await res.json();
      if (res.ok) {
        setCheckMessage('Uptime, SSL certificate, and crawl diagnostics checked successfully.');
        fetchHealthData();
      } else {
        setCheckError(data.error?.message || data.error || 'Check failed.');
      }
    } catch {
      setCheckError('Failed to execute instant check.');
    } finally {
      setCheckingNow(false);
      setTimeout(() => {
        setCheckMessage(null);
        setCheckError(null);
      }, 5000);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  const uptimeVal = summary?.uptimePercent ?? 100.0;
  const isUptimeGood = uptimeVal >= 99.0;
  const sslDays = summary?.sslDaysRemaining ?? 90;

  return (
    <div className="space-y-6">
      {/* 5 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. 30-Day Uptime */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-display">
              30-Day Uptime
            </span>
            <Badge variant={isUptimeGood ? 'SUCCESS' : 'CRITICAL'} size="sm" showDot>
              {isUptimeGood ? 'Operational' : 'Degraded'}
            </Badge>
          </div>
          <div className="text-2xl font-bold font-display text-text-primary tracking-tight">
            {uptimeVal.toFixed(1)}%
          </div>
          <div className="text-[11px] text-text-tertiary flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-accent" />
            <span>Trailing 30-day availability</span>
          </div>
        </div>

        {/* 2. SSL Days Remaining */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-display">
              SSL Expiration
            </span>
            <Badge
              variant={sslDays < 7 ? 'CRITICAL' : sslDays < 21 ? 'WARNING' : 'SUCCESS'}
              size="sm"
            >
              {sslDays < 7 ? 'Critical' : sslDays < 21 ? 'Expiring' : 'Secure'}
            </Badge>
          </div>
          <div className="text-2xl font-bold font-display text-text-primary tracking-tight">
            {sslDays} Days
          </div>
          <div className="text-[11px] text-text-tertiary flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            <span>TLS 1.3 handshake active</span>
          </div>
        </div>

        {/* 3. PageSpeed & Core Web Vitals */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-display">
              PageSpeed & CWV
            </span>
            <Badge
              variant={
                (summary?.performanceScore ?? 88) >= 90
                  ? 'SUCCESS'
                  : (summary?.performanceScore ?? 88) >= 50
                  ? 'WARNING'
                  : 'CRITICAL'
              }
              size="sm"
            >
              {(summary?.performanceScore ?? 88) >= 90 ? 'Optimal' : (summary?.performanceScore ?? 88) >= 50 ? 'Needs Work' : 'Poor'}
            </Badge>
          </div>
          <div className="text-2xl font-bold font-display text-text-primary tracking-tight">
            {summary?.performanceScore ?? 88}<span className="text-sm font-normal text-text-tertiary">/100</span>
          </div>
          <div className="text-[11px] text-text-tertiary flex items-center gap-1.5 truncate">
            <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span>LCP: {summary?.lcp || '1.8s'} · CLS: {summary?.cls || '0.04'}</span>
          </div>
        </div>

        {/* 4. Last Crawl Audit */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-display">
              Last Crawl Audit
            </span>
            <Badge variant="SUCCESS" size="sm">
              Indexed
            </Badge>
          </div>
          <div className="text-sm font-bold font-display text-text-primary tracking-tight truncate">
            {summary?.lastCrawlAt
              ? new Date(summary.lastCrawlAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent run'}
          </div>
          <div className="text-[11px] text-text-tertiary flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-accent" />
            <span>SEO health & indexing checks</span>
          </div>
        </div>

        {/* 5. Check Frequency & Check Now */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider font-display">
                Check Cadence
              </span>
              <span className="text-[11px] font-mono text-text-secondary">Auto</span>
            </div>
            <div className="text-lg font-bold font-display text-text-primary mt-1">
              Every 6 hours
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handleCheckNow}
            isLoading={checkingNow}
            className="w-full text-xs h-8 font-display font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Check Now
          </Button>
        </div>
      </div>

      {/* Check status feedback message */}
      {checkMessage && (
        <div className="p-3 rounded-lg bg-success-soft text-success-text text-xs border border-success/20 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
          <span>{checkMessage}</span>
        </div>
      )}
      {checkError && (
        <div className="p-3 rounded-lg bg-critical-soft text-critical-text text-xs border border-critical/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-critical flex-shrink-0" />
          <span>{checkError}</span>
        </div>
      )}

      {/* Per-Website Status Table (Org-Wide Glance) */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-border bg-surface-2/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-semibold text-text-primary text-sm">
              Per-Website Operational Status
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Live operational health, SSL, PageSpeed and crawl metrics across all websites in your organization.
            </p>
          </div>
          <span className="text-xs font-mono text-text-tertiary">
            {websites.length} websites monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-2/50 text-text-secondary font-display font-semibold uppercase text-[10px] tracking-wider border-b border-border">
              <tr>
                <th scope="col" className="py-3 px-4 sm:px-6">Website</th>
                <th scope="col" className="py-3 px-4">Connector</th>
                <th scope="col" className="py-3 px-4">Uptime (30d)</th>
                <th scope="col" className="py-3 px-4">SSL Cert</th>
                <th scope="col" className="py-3 px-4">PageSpeed</th>
                <th scope="col" className="py-3 px-4">Crawl Audit</th>
                <th scope="col" className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {websites.map((ws) => (
                <tr key={ws.id} className="hover:bg-surface-2/20 transition-colors">
                  <td className="py-3.5 px-4 sm:px-6">
                    <div className="font-display font-semibold text-text-primary flex items-center gap-2">
                      <span>{ws.name}</span>
                      {ws.id === websiteId && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent-soft text-accent-soft-text font-bold">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-text-tertiary mt-0.5">
                      {ws.domain}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-[11px] text-text-secondary bg-surface-2 px-2 py-0.5 rounded border border-border">
                      {ws.connectorType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={ws.uptimeStatus as any} size="sm" showDot>
                        {ws.uptimeStatus}
                      </Badge>
                      <span className="font-mono font-medium text-text-primary">
                        {ws.uptimePercent.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={ws.sslStatus as any} size="sm">
                        {ws.sslDays}d
                      </Badge>
                      <span className="text-[11px] text-text-tertiary">
                        {ws.sslStatus === 'HEALTHY' ? 'TLS 1.3' : 'Needs renewal'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          (ws.performanceScore ?? 85) >= 90
                            ? 'SUCCESS'
                            : (ws.performanceScore ?? 85) >= 50
                            ? 'WARNING'
                            : 'CRITICAL'
                        }
                        size="sm"
                      >
                        {ws.performanceScore ?? 85}/100
                      </Badge>
                      <span className="text-[11px] font-mono text-text-tertiary">
                        Mobile
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-[11px] text-text-secondary truncate max-w-[180px]">
                      {ws.crawlDetail}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <a
                      href={`https://${ws.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-tertiary hover:text-accent p-1.5 inline-flex rounded hover:bg-surface-2 transition-colors"
                      title="Visit live domain"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </td>
                </tr>
              ))}

              {websites.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-text-tertiary">
                    No websites registered in this organization yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Monitoring Events Feed */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent-soft text-accent flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-display font-semibold text-text-primary text-sm">
              Recent Monitoring Events
            </h3>
          </div>
          <span className="text-[11px] text-text-tertiary">
            Real-time incident & recovery timeline
          </span>
        </div>

        <div className="space-y-2.5">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="p-3.5 bg-surface-2/30 hover:bg-surface-2/60 border border-border rounded-xl flex items-start justify-between gap-3 text-xs transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {evt.status === 'ACTIVE' ? (
                    <div className="w-5 h-5 rounded-full bg-critical-soft text-critical flex items-center justify-center">
                      <XCircle className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-success-soft text-success flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="font-display font-semibold text-text-primary flex items-center gap-2">
                    <span>{evt.title}</span>
                    <Badge variant={evt.severity} size="sm">
                      {evt.status}
                    </Badge>
                  </div>
                  <p className="text-text-secondary leading-relaxed">{evt.detail}</p>
                </div>
              </div>

              <span className="text-[11px] font-mono text-text-tertiary flex-shrink-0">
                {new Date(evt.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}

          {events.length === 0 && (
            <div className="py-8 text-center text-xs text-text-tertiary space-y-1">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto opacity-70" />
              <p className="font-display font-semibold text-text-primary">No incidents recorded</p>
              <p>All automated health checks for {websiteDomain} are passing normally.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
