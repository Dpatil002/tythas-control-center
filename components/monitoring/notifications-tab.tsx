'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  ExternalLink,
  ShieldAlert,
  Sliders,
  RefreshCw,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'SUCCESS' | 'INFO';
  title: string;
  detail: string;
  linkPath: string | null;
  readAt: string | null;
  createdAt: string;
  website: { id: string; name: string; domain: string } | null;
}

interface NotificationPreferences {
  sslExpiry: boolean;
  newLead: boolean;
  seoAudit: boolean;
  publishingAndForms: boolean;
  websiteDown: boolean;
  connectionErrors: boolean;
}

export const NotificationsTab: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [counts, setCounts] = useState({ all: 0, unread: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Preferences State
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    sslExpiry: true,
    newLead: true,
    seoAudit: true,
    publishingAndForms: true,
    websiteDown: true,
    connectionErrors: true,
  });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferenceSuccess, setPreferenceSuccess] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || data.data?.notifications || []);
        if (data.counts || data.data?.counts) {
          setCounts(data.counts || data.data?.counts);
        }
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/notification-preferences');
      if (res.ok) {
        const data = await res.json();
        const p = data.preferences || data.data?.preferences;
        if (p) setPreferences(p);
      }
    } catch (err) {
      console.error('Failed to load preferences', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      setActionLoading('mark_all');
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
        );
        setCounts((prev) => ({ ...prev, unread: 0 }));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setCounts((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPreferences(true);
      setPreferenceSuccess(false);
      const res = await fetch('/api/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      if (res.ok) {
        setPreferenceSuccess(true);
        setTimeout(() => setPreferenceSuccess(false), 4000);
      }
    } finally {
      setSavingPreferences(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-semibold text-text-primary text-base">
            Notification Center
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Operational alerts, lead notifications, and security warnings for your accessible websites.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Segmented Filter */}
          <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-lg text-xs font-medium border border-border/60">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filter === 'all'
                  ? 'bg-surface text-text-primary font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filter === 'unread'
                  ? 'bg-surface text-text-primary font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Unread ({counts.unread})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filter === 'critical'
                  ? 'bg-critical-soft text-critical-text font-semibold shadow-xs'
                  : 'text-critical hover:bg-critical-soft/50'
              }`}
            >
              Critical ({counts.critical})
            </button>
          </div>

          {/* Mark all read button */}
          {counts.unread > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              isLoading={actionLoading === 'mark_all'}
              className="text-xs font-display font-semibold h-9"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications Feed */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-border bg-surface-2/30 flex items-center justify-between text-xs">
          <span className="font-display font-semibold uppercase tracking-wider text-[11px] text-text-secondary">
            Alerts & Events ({notifications.length})
          </span>
          <span className="text-text-tertiary text-[11px]">
            Filtered by: <span className="font-semibold text-text-primary uppercase">{filter}</span>
          </span>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 animate-spin text-accent" />
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-border">
            {notifications.map((item) => {
              const isUnread = !item.readAt;

              return (
                <div
                  key={item.id}
                  className={`p-4 sm:px-6 hover:bg-surface-2/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isUnread ? 'bg-accent/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">
                      {item.severity === 'CRITICAL' && (
                        <div className="w-7 h-7 rounded-lg bg-critical-soft text-critical flex items-center justify-center border border-critical/20">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                      )}
                      {item.severity === 'WARNING' && (
                        <div className="w-7 h-7 rounded-lg bg-warning-soft text-warning flex items-center justify-center border border-warning/20">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                      {item.severity === 'SUCCESS' && (
                        <div className="w-7 h-7 rounded-lg bg-success-soft text-success flex items-center justify-center border border-success/20">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      {item.severity === 'INFO' && (
                        <div className="w-7 h-7 rounded-lg bg-info-soft text-info flex items-center justify-center border border-info/20">
                          <Info className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-semibold text-text-primary text-sm">
                          {item.title}
                        </span>
                        <Badge variant={item.severity} size="sm">
                          {item.severity}
                        </Badge>
                        {item.website ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-2 border border-border text-text-secondary">
                            {item.website.name}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-2 border border-border text-text-tertiary">
                            Organization
                          </span>
                        )}
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-accent" title="Unread" />
                        )}
                      </div>

                      <p className="text-text-secondary leading-relaxed font-body text-xs">
                        {item.detail}
                      </p>

                      <div className="text-[11px] text-text-tertiary font-mono pt-0.5">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    {item.linkPath && (
                      <Link
                        href={item.linkPath}
                        onClick={() => handleMarkSingleRead(item.id)}
                      >
                        <Button size="sm" variant="secondary" className="text-xs h-8">
                          <span>Action</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    )}
                    {isUnread && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkSingleRead(item.id)}
                        className="text-xs h-8 text-text-tertiary hover:text-text-primary"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-text-secondary space-y-2">
            <Bell className="w-8 h-8 text-text-tertiary mx-auto opacity-60" />
            <p className="font-display font-semibold text-text-primary text-sm">
              No {filter !== 'all' ? filter : ''} notifications found
            </p>
            <p className="text-text-tertiary max-w-sm mx-auto">
              You are all caught up. Operational events and lead submissions will appear here automatically.
            </p>
          </div>
        )}
      </div>

      {/* Notification Preferences Panel */}
      <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent-soft text-accent flex items-center justify-center">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-display font-semibold text-text-primary text-sm">
              Notification Preferences
            </h3>
          </div>
          <span className="text-xs text-text-tertiary">Per-user alert configuration</span>
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-4">
          <div className="space-y-3">
            {/* 1. Website Down / Connection Errors (Always ON) */}
            <div className="p-3.5 rounded-lg bg-surface-2/60 border border-border/80 flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-xs text-text-primary">
                    Website Down & Connection Errors
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent-soft text-accent-soft-text flex items-center gap-1 font-semibold">
                    <Lock className="w-2.5 h-2.5" /> Required
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary">
                  Critical operational alerts when client websites fail uptime checks or connector sync errors occur.
                </p>
              </div>
              <input
                type="checkbox"
                checked={true}
                disabled
                className="mt-1 rounded border-border text-accent focus:ring-accent cursor-not-allowed opacity-80"
              />
            </div>

            {/* 2. SSL Expiry */}
            <label className="p-3.5 rounded-lg bg-surface-2/30 hover:bg-surface-2/60 border border-border flex items-start justify-between gap-3 cursor-pointer transition-colors">
              <div className="space-y-0.5">
                <span className="font-display font-semibold text-xs text-text-primary">
                  SSL Certificate Expiry Warnings
                </span>
                <p className="text-[11px] text-text-secondary">
                  Alerts when an SSL certificate reaches 21 days and 7 days before expiration.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.sslExpiry}
                onChange={(e) =>
                  setPreferences((p) => ({ ...p, sslExpiry: e.target.checked }))
                }
                className="mt-1 rounded border-border text-accent focus:ring-accent"
              />
            </label>

            {/* 3. New Leads */}
            <label className="p-3.5 rounded-lg bg-surface-2/30 hover:bg-surface-2/60 border border-border flex items-start justify-between gap-3 cursor-pointer transition-colors">
              <div className="space-y-0.5">
                <span className="font-display font-semibold text-xs text-text-primary">
                  New Lead Inquiries
                </span>
                <p className="text-[11px] text-text-secondary">
                  Instant in-app alerts whenever a visitor submits a contact form on your connected websites.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.newLead}
                onChange={(e) =>
                  setPreferences((p) => ({ ...p, newLead: e.target.checked }))
                }
                className="mt-1 rounded border-border text-accent focus:ring-accent"
              />
            </label>

            {/* 4. SEO Audits */}
            <label className="p-3.5 rounded-lg bg-surface-2/30 hover:bg-surface-2/60 border border-border flex items-start justify-between gap-3 cursor-pointer transition-colors">
              <div className="space-y-0.5">
                <span className="font-display font-semibold text-xs text-text-primary">
                  SEO Audit Completions & New Issues
                </span>
                <p className="text-[11px] text-text-secondary">
                  Notifications when scheduled crawler diagnostics find new critical SEO or schema flags.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.seoAudit}
                onChange={(e) =>
                  setPreferences((p) => ({ ...p, seoAudit: e.target.checked }))
                }
                className="mt-1 rounded border-border text-accent focus:ring-accent"
              />
            </label>

            {/* 5. Publishing & Forms */}
            <label className="p-3.5 rounded-lg bg-surface-2/30 hover:bg-surface-2/60 border border-border flex items-start justify-between gap-3 cursor-pointer transition-colors">
              <div className="space-y-0.5">
                <span className="font-display font-semibold text-xs text-text-primary">
                  Content Publishing & Form Delivery Actions
                </span>
                <p className="text-[11px] text-text-secondary">
                  Confirmations for page/blog publish completions and warnings on form webhook delivery failures.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.publishingAndForms}
                onChange={(e) =>
                  setPreferences((p) => ({ ...p, publishingAndForms: e.target.checked }))
                }
                className="mt-1 rounded border-border text-accent focus:ring-accent"
              />
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            {preferenceSuccess ? (
              <span className="text-xs text-success flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Preferences updated successfully
              </span>
            ) : (
              <span />
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={savingPreferences}
              className="text-xs font-semibold font-display"
            >
              Save Preferences
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
