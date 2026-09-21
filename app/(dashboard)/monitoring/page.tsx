'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useShell } from '@/components/shell/context';
import { SiteHealthTab } from '@/components/monitoring/site-health-tab';
import { NotificationsTab } from '@/components/monitoring/notifications-tab';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Activity, Bell, Globe, Plus } from 'lucide-react';

export default function MonitoringPage() {
  const { activeWebsite, setAddWebsiteOpen } = useShell();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'health' | 'notifications'>(
    tabParam === 'notifications' ? 'notifications' : 'health'
  );

  useEffect(() => {
    if (tabParam === 'notifications') {
      setActiveTab('notifications');
    } else if (tabParam === 'health') {
      setActiveTab('health');
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'health' | 'notifications') => {
    setActiveTab(tab);
    router.replace(`/monitoring?tab=${tab}`);
  };

  if (!activeWebsite) {
    return (
      <div className="py-16">
        <EmptyState
          icon={<Globe className="w-8 h-8 text-accent" />}
          title="No verified website selected"
          description="Add a new website to your organization to start monitoring its uptime, SSL certificates, and notification alerts."
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

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-display tracking-tight">
              Monitoring & Notifications
            </h1>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-accent-soft text-accent-soft-text uppercase">
              Phase 7
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Real-time operational health checks, incident timelines, and notification center for{' '}
            <span className="font-mono font-semibold text-text-primary">
              {activeWebsite.domain}
            </span>.
          </p>
        </div>

        {/* Tab Navigation Pill Switcher */}
        <div className="flex items-center bg-surface-2 p-1 rounded-xl border border-border/80 text-xs font-medium self-start sm:self-center">
          <button
            onClick={() => handleTabChange('health')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'health'
                ? 'bg-surface text-text-primary font-semibold shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Site Health</span>
          </button>
          <button
            onClick={() => handleTabChange('notifications')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'notifications'
                ? 'bg-surface text-text-primary font-semibold shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'health' ? (
        <SiteHealthTab
          websiteId={activeWebsite.id}
          websiteDomain={activeWebsite.domain}
        />
      ) : (
        <NotificationsTab />
      )}
    </div>
  );
}
