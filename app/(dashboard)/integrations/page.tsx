'use client';

import React, { useState } from 'react';
import { useShell } from '@/components/shell/context';
import { Tabs, TabItem } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Globe,
  Activity,
  Layers,
  MapPin,
  Code,
  ShieldCheck,
} from 'lucide-react';
import { ConnectionsTab } from '@/components/integrations/connections-tab';
import { ConversionsTab } from '@/components/integrations/conversions-tab';
import { LocalSeoTab } from '@/components/integrations/local-seo-tab';
import { CustomScriptsTab } from '@/components/integrations/custom-scripts-tab';

export default function IntegrationsPage() {
  const { activeWebsite } = useShell();
  const [activeTab, setActiveTab] = useState<string>('connections');

  if (!activeWebsite) {
    return (
      <div className="p-8">
        <EmptyState
          icon={<Globe className="w-8 h-8 text-accent" />}
          title="No website selected"
          description="Select a website from the top switcher to manage its external integrations, conversion events, and tracking."
        />
      </div>
    );
  }

  const tabs: TabItem[] = [
    { id: 'connections', label: 'Connections' },
    { id: 'conversions', label: 'Conversion Events' },
    { id: 'local-seo', label: 'Local SEO (GBP)' },
    { id: 'custom-scripts', label: 'Custom Scripts' },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs text-text-tertiary font-mono mb-1.5">
          <span>{activeWebsite.name}</span>
          <span>/</span>
          <span className="text-text-secondary">Integrations & Tracking</span>
        </div>
        <h1 className="text-2xl font-display font-bold text-text-primary tracking-tight">
          Integrations & Tracking
        </h1>
        <p className="text-xs text-text-secondary mt-1 max-w-2xl">
          Manage third-party analytics connections, server-side conversion mapping, Google Business Profile signals, and raw custom script injections for <span className="font-mono text-text-primary font-medium">{activeWebsite.domain}</span>.
        </p>
      </div>

      {/* Inner Tabs Navigation */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'connections' && (
          <ConnectionsTab
            websiteId={activeWebsite.id}
            websiteDomain={activeWebsite.domain}
            websiteName={activeWebsite.name}
          />
        )}

        {activeTab === 'conversions' && (
          <ConversionsTab
            websiteId={activeWebsite.id}
            onNavigateToConnections={() => setActiveTab('connections')}
          />
        )}

        {activeTab === 'local-seo' && (
          <LocalSeoTab
            websiteId={activeWebsite.id}
            websiteDomain={activeWebsite.domain}
            websiteName={activeWebsite.name}
          />
        )}

        {activeTab === 'custom-scripts' && (
          <CustomScriptsTab
            websiteId={activeWebsite.id}
            websiteDomain={activeWebsite.domain}
          />
        )}
      </div>
    </div>
  );
}
