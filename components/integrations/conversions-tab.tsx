'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Plus,
  Target,
  Share2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Settings,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';

interface MappingItem {
  id: string;
  provider: 'GA4' | 'GOOGLE_ADS' | 'META';
  externalEventName?: string | null;
  externalConversionId?: string | null;
}

interface ConversionEventItem {
  id: string;
  name: string;
  classification: 'PRIMARY' | 'SECONDARY';
  mappings: MappingItem[];
  createdAt: string;
}

interface ConversionsTabProps {
  websiteId: string;
  onNavigateToConnections?: () => void;
}

const SUPPORTED_MAPPING_PROVIDERS: Array<{
  provider: 'GA4' | 'GOOGLE_ADS' | 'META';
  label: string;
  icon: React.ReactNode;
  defaultEventName: string;
  idLabel?: string;
  nameLabel: string;
}> = [
  {
    provider: 'GA4',
    label: 'Google Analytics 4',
    icon: <Activity className="w-4 h-4 text-amber-500" />,
    nameLabel: 'GA4 Event Name',
    defaultEventName: 'generate_lead',
  },
  {
    provider: 'GOOGLE_ADS',
    label: 'Google Ads',
    icon: <Target className="w-4 h-4 text-emerald-500" />,
    nameLabel: 'Conversion Action Name',
    idLabel: 'Conversion Action ID / Label',
    defaultEventName: 'submit_lead_form',
  },
  {
    provider: 'META',
    label: 'Meta Pixel & CAPI',
    icon: <Share2 className="w-4 h-4 text-sky-500" />,
    nameLabel: 'Meta Standard Event Name',
    defaultEventName: 'Lead',
  },
];

export const ConversionsTab: React.FC<ConversionsTabProps> = ({
  websiteId,
  onNavigateToConnections,
}) => {
  const [events, setEvents] = useState<ConversionEventItem[]>([]);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Add Event Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newClassification, setNewClassification] = useState<'PRIMARY' | 'SECONDARY'>('SECONDARY');

  // Mapping Modal
  const [mappingEvent, setMappingEvent] = useState<ConversionEventItem | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'GA4' | 'GOOGLE_ADS' | 'META'>('GA4');
  const [externalEventName, setExternalEventName] = useState('');
  const [externalConversionId, setExternalConversionId] = useState('');
  const [mappingError, setMappingError] = useState<string | null>(null);

  // Delete Event Confirm
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/websites/${websiteId}/conversion-events`);
      if (res.ok) {
        const resJson = await res.json();
        const data = resJson.data || resJson;
        setEvents(data.events || []);
        setConnectedProviders(data.connectedProviders || []);
      }
    } catch (err) {
      console.error('Failed to load conversion events', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [websiteId]);

  const handleToggleClassification = async (
    eventId: string,
    current: 'PRIMARY' | 'SECONDARY'
  ) => {
    const next = current === 'PRIMARY' ? 'SECONDARY' : 'PRIMARY';
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, classification: next } : e))
    );

    try {
      await fetch(`/api/websites/${websiteId}/conversion-events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classification: next }),
      });
    } catch (err) {
      console.error('Failed to toggle classification', err);
      fetchEvents();
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    try {
      setActionLoading('create_event');
      const res = await fetch(`/api/websites/${websiteId}/conversion-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEventName.trim(),
          classification: newClassification,
        }),
      });

      if (res.ok) {
        setNewEventName('');
        setShowAddModal(false);
        fetchEvents();
      } else {
        const resJson = await res.json();
        alert(resJson.error?.message || 'Failed to create event');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const openMappingModal = (event: ConversionEventItem) => {
    setMappingEvent(event);
    setSelectedProvider('GA4');
    const existingGA4 = event.mappings.find((m) => m.provider === 'GA4');
    setExternalEventName(existingGA4?.externalEventName || 'generate_lead');
    setExternalConversionId('');
    setMappingError(null);
  };

  const handleProviderSelectInModal = (p: 'GA4' | 'GOOGLE_ADS' | 'META') => {
    setSelectedProvider(p);
    setMappingError(null);
    const existing = mappingEvent?.mappings.find((m) => m.provider === p);
    const meta = SUPPORTED_MAPPING_PROVIDERS.find((m) => m.provider === p);
    setExternalEventName(existing?.externalEventName || meta?.defaultEventName || '');
    setExternalConversionId(existing?.externalConversionId || '');
  };

  const handleSaveMapping = async () => {
    if (!mappingEvent) return;
    setMappingError(null);

    const isConnected = connectedProviders.includes(selectedProvider);
    if (!isConnected) {
      setMappingError(
        `Cannot map event to ${selectedProvider}: This platform is not connected yet. Please connect ${selectedProvider} in the Connections tab first.`
      );
      return;
    }

    try {
      setActionLoading('save_mapping');
      const res = await fetch(
        `/api/websites/${websiteId}/conversion-events/${mappingEvent.id}/mappings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: selectedProvider,
            externalEventName: externalEventName.trim() || undefined,
            externalConversionId: externalConversionId.trim() || undefined,
          }),
        }
      );

      const resJson = await res.json();
      const data = resJson.data || resJson;
      if (res.ok) {
        await fetchEvents();
        setMappingEvent((prev) => {
          if (!prev) return null;
          const remaining = prev.mappings.filter((m) => m.provider !== selectedProvider);
          return {
            ...prev,
            mappings: [...remaining, data.mapping],
          };
        });
      } else {
        setMappingError(resJson.error?.message || 'Failed to save mapping');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMapping = async (provider: string) => {
    if (!mappingEvent) return;
    try {
      setActionLoading(`remove_${provider}`);
      const res = await fetch(
        `/api/websites/${websiteId}/conversion-events/${mappingEvent.id}/mappings/${provider}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        await fetchEvents();
        setMappingEvent((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            mappings: prev.mappings.filter((m) => m.provider !== provider),
          };
        });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deletingEventId) return;
    try {
      setActionLoading('delete_event');
      const res = await fetch(
        `/api/websites/${websiteId}/conversion-events/${deletingEventId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setDeletingEventId(null);
        fetchEvents();
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <RefreshCw className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-semibold text-text-primary text-base">
              Conversion Event Manager
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Classify primary and secondary goals, and map each event onto your connected marketing platforms (GA4, Google Ads, Meta).
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="flex-shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Conversion Event
          </Button>
        </div>
      </div>

      {/* Events Table / List */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-border bg-surface-2/40 flex items-center justify-between">
          <div className="text-xs font-semibold text-text-primary font-display uppercase tracking-wider">
            Tracked Conversion Events ({events.length})
          </div>
          <span className="text-[11px] text-text-tertiary">
            Primary goals drive optimization, Secondary goals track micro-conversions.
          </span>
        </div>

        <div className="divide-y divide-border">
          {events.map((event) => {
            const isPrimary = event.classification === 'PRIMARY';
            const mappedProviders = event.mappings.map((m) => m.provider);

            return (
              <div
                key={event.id}
                className="p-4 sm:px-6 hover:bg-surface-2/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Event Name & Classification */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isPrimary
                        ? 'bg-accent-soft text-accent-soft-text border border-accent/20'
                        : 'bg-surface-2 text-text-secondary border border-border'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-sm text-text-primary truncate">
                        {event.name}
                      </span>
                      <Badge
                        variant={isPrimary ? 'accent' : 'neutral'}
                        className="text-[10px] font-mono uppercase tracking-wider"
                      >
                        {event.classification}
                      </Badge>
                    </div>
                    {/* Platform Mappings Pills */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] text-text-tertiary">Mapped to:</span>
                      {SUPPORTED_MAPPING_PROVIDERS.map((p) => {
                        const isMapped = mappedProviders.includes(p.provider);

                        if (isMapped) {
                          return (
                            <span
                              key={p.provider}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-surface-2 border border-border-strong text-text-primary"
                            >
                              {p.icon}
                              {p.provider}
                              <CheckCircle2 className="w-2.5 h-2.5 text-success ml-0.5" />
                            </span>
                          );
                        }
                        return null;
                      })}
                      {mappedProviders.length === 0 && (
                        <span className="text-[11px] text-text-tertiary italic">
                          No platforms mapped yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controls: Segmented Classification + Mapping Button + Delete */}
                <div className="flex items-center gap-3 self-end md:self-center">
                  {/* Primary / Secondary Segmented Switch */}
                  <div className="flex p-0.5 rounded-lg bg-surface-2 border border-border text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        !isPrimary && handleToggleClassification(event.id, event.classification)
                      }
                      className={`
                        px-2.5 py-1 rounded-md text-xs font-display font-medium transition-all
                        ${
                          isPrimary
                            ? 'bg-accent text-white shadow-sm font-semibold'
                            : 'text-text-secondary hover:text-text-primary'
                        }
                      `}
                    >
                      Primary
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        isPrimary && handleToggleClassification(event.id, event.classification)
                      }
                      className={`
                        px-2.5 py-1 rounded-md text-xs font-display font-medium transition-all
                        ${
                          !isPrimary
                            ? 'bg-surface text-text-primary shadow-sm font-semibold border border-border'
                            : 'text-text-secondary hover:text-text-primary'
                        }
                      `}
                    >
                      Secondary
                    </button>
                  </div>

                  {/* Platform Mapping Modal Opener */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openMappingModal(event)}
                    className="text-xs"
                  >
                    <Settings className="w-3.5 h-3.5 mr-1.5" />
                    Platform Mapping ({mappedProviders.length}/3)
                  </Button>

                  {/* Delete Event */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-text-tertiary hover:text-critical hover:bg-critical-soft px-2"
                    title="Delete conversion event"
                    onClick={() => setDeletingEventId(event.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {events.length === 0 && (
            <div className="p-8 text-center text-xs text-text-secondary">
              No conversion events defined yet. Click &quot;Add Conversion Event&quot; to begin.
            </div>
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Conversion Event"
        description="Define a new user conversion event to track and classify."
      >
        <form onSubmit={handleCreateEvent} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">
              Event Name
            </label>
            <Input
              placeholder="e.g. Schedule Consultation / Quote Request"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">
              Goal Classification
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setNewClassification('PRIMARY')}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-all
                  ${
                    newClassification === 'PRIMARY'
                      ? 'border-accent bg-accent/5 ring-1 ring-accent/30 text-text-primary'
                      : 'border-border bg-surface text-text-secondary hover:bg-surface-2'
                  }
                `}
              >
                <div className="font-semibold text-xs font-display">Primary Goal</div>
                <div className="text-[11px] text-text-tertiary mt-0.5">
                  High-value actions (form submits, transactions, bookings).
                </div>
              </div>
              <div
                onClick={() => setNewClassification('SECONDARY')}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-all
                  ${
                    newClassification === 'SECONDARY'
                      ? 'border-accent bg-accent/5 ring-1 ring-accent/30 text-text-primary'
                      : 'border-border bg-surface text-text-secondary hover:bg-surface-2'
                  }
                `}
              >
                <div className="font-semibold text-xs font-display">Secondary Goal</div>
                <div className="text-[11px] text-text-tertiary mt-0.5">
                  Micro-conversions (brochure downloads, button clicks).
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={actionLoading === 'create_event'}
            >
              Save Event
            </Button>
          </div>
        </form>
      </Modal>

      {/* Platform Mapping Modal / Drawer */}
      <Modal
        isOpen={!!mappingEvent}
        onClose={() => setMappingEvent(null)}
        title={`Platform Mapping: ${mappingEvent?.name}`}
        description="Configure which external platforms receive this conversion event and customize event names."
      >
        <div className="space-y-5 py-2">
          {/* Provider Tabs */}
          <div className="grid grid-cols-3 gap-2">
            {SUPPORTED_MAPPING_PROVIDERS.map((p) => {
              const isSelected = selectedProvider === p.provider;
              const isConnected = connectedProviders.includes(p.provider);
              const hasMapping = mappingEvent?.mappings.some((m) => m.provider === p.provider);

              return (
                <button
                  key={p.provider}
                  type="button"
                  onClick={() => handleProviderSelectInModal(p.provider)}
                  className={`
                    p-3 rounded-lg border text-left flex flex-col justify-between gap-2 transition-all
                    ${
                      isSelected
                        ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                        : 'border-border bg-surface hover:bg-surface-2'
                    }
                  `}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="p-1 rounded bg-surface-2">{p.icon}</span>
                    {hasMapping && (
                      <Badge variant="success" className="text-[9px] px-1 py-0 font-mono">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary font-display truncate">
                      {p.label}
                    </div>
                    <div className="text-[10px] text-text-tertiary font-mono">
                      {isConnected ? 'Connected' : 'Not connected'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Configuration Form for Selected Provider */}
          {(() => {
            const providerMeta = SUPPORTED_MAPPING_PROVIDERS.find(
              (p) => p.provider === selectedProvider
            );
            const isConnected = connectedProviders.includes(selectedProvider);
            const existingMapping = mappingEvent?.mappings.find(
              (m) => m.provider === selectedProvider
            );

            return (
              <div className="p-4 rounded-xl bg-surface-2/50 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-text-primary">
                      {providerMeta?.label} Mapping
                    </span>
                    {isConnected ? (
                      <Badge variant="success" className="text-[10px]">
                        Platform Ready
                      </Badge>
                    ) : (
                      <Badge variant="critical" className="text-[10px]">
                        Not Connected
                      </Badge>
                    )}
                  </div>

                  {existingMapping && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-critical text-xs h-7"
                      isLoading={actionLoading === `remove_${selectedProvider}`}
                      onClick={() => handleRemoveMapping(selectedProvider)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remove Mapping
                    </Button>
                  )}
                </div>

                {!isConnected ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      Platform Not Connected
                    </div>
                    <p className="text-text-secondary text-[11px]">
                      {providerMeta?.label} must be connected in the Connections tab before you can map conversion events to it.
                    </p>
                    {onNavigateToConnections && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 mt-1 bg-surface"
                        onClick={() => {
                          setMappingEvent(null);
                          onNavigateToConnections();
                        }}
                      >
                        Go to Connections Tab
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-text-secondary">
                        {providerMeta?.nameLabel}
                      </label>
                      <Input
                        value={externalEventName}
                        onChange={(e) => setExternalEventName(e.target.value)}
                        placeholder={`e.g. ${providerMeta?.defaultEventName}`}
                        className="font-mono text-xs"
                      />
                    </div>

                    {providerMeta?.idLabel && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-text-secondary">
                          {providerMeta.idLabel}
                        </label>
                        <Input
                          value={externalConversionId}
                          onChange={(e) => setExternalConversionId(e.target.value)}
                          placeholder="e.g. 123456789/AbCdEfGhIj"
                          className="font-mono text-xs"
                        />
                      </div>
                    )}

                    {mappingError && (
                      <div className="text-critical text-xs flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {mappingError}
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={actionLoading === 'save_mapping'}
                        onClick={handleSaveMapping}
                      >
                        {existingMapping ? 'Update Mapping' : 'Save Platform Mapping'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="pt-3 border-t border-border flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMappingEvent(null)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingEventId}
        onClose={() => setDeletingEventId(null)}
        onConfirm={handleDeleteEvent}
        title="Delete Conversion Event?"
        description="Deleting this conversion event will remove all platform mappings associated with it. Are you sure?"
        confirmText="Delete Event"
        isDestructive
        isLoading={actionLoading === 'delete_event'}
      />
    </div>
  );
};
