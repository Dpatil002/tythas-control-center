'use client';

import React, { useState, useEffect } from 'react';
import { useShell } from '@/components/shell/context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Compass,
  Plus,
  Save,
  Trash2,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  ExternalLink,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Layers
} from 'lucide-react';

interface NavItem {
  id?: string;
  label: string;
  url: string;
  target: string;
  order: number;
  parentId?: string | null;
}

export default function NavigationPage() {
  const { activeWebsite, setAddWebsiteOpen } = useShell();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menus, setMenus] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('primary');
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  const [currentItems, setCurrentItems] = useState<NavItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAuditOnly = activeWebsite?.connectionState === 'AUDIT_ONLY' || activeWebsite?.connectionState === 'DISCONNECTED';

  const fetchNavigation = async () => {
    if (!activeWebsite) return;
    setLoading(true);
    try {
      const [navRes, pagesRes] = await Promise.all([
        fetch(`/api/websites/${activeWebsite.id}/navigation`),
        fetch(`/api/websites/${activeWebsite.id}/pages`),
      ]);

      if (navRes.ok) {
        const json = await navRes.json();
        const menuList = json.data.menus || [];
        setMenus(menuList);
        const activeMenu = menuList.find((m: any) => m.location === selectedLocation) || menuList[0];
        if (activeMenu) {
          setCurrentItems(activeMenu.items || []);
        }
      }

      if (pagesRes.ok) {
        const json = await pagesRes.json();
        setAvailablePages(json.data.pages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNavigation();
  }, [activeWebsite?.id]);

  const handleSelectLocation = (loc: string) => {
    setSelectedLocation(loc);
    const menu = menus.find((m) => m.location === loc);
    if (menu) {
      setCurrentItems(menu.items || []);
    } else {
      setCurrentItems([]);
    }
    setStatusMessage(null);
  };

  const handleAddItem = (presetUrl?: string, presetLabel?: string) => {
    const newItem: NavItem = {
      id: `temp_${Date.now()}`,
      label: presetLabel || 'New Link',
      url: presetUrl || '/',
      target: '_self',
      order: currentItems.length,
      parentId: null,
    };
    setCurrentItems([...currentItems, newItem]);
  };

  const handleUpdateItem = (index: number, field: keyof NavItem, value: any) => {
    const updated = [...currentItems];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setCurrentItems(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentItems.length) return;

    const updated = [...currentItems];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    updated.forEach((item, idx) => (item.order = idx));
    setCurrentItems(updated);
  };

  const handleToggleNesting = (index: number) => {
    if (index === 0) return; // first item cannot be nested
    const updated = [...currentItems];
    const item = updated[index];
    const prevItem = updated[index - 1];

    if (item.parentId) {
      // Un-nest
      item.parentId = null;
    } else {
      // Nest under previous item
      item.parentId = prevItem.id || `temp_${index - 1}`;
    }
    setCurrentItems(updated);
  };

  const handleDeleteItem = (index: number) => {
    const updated = currentItems.filter((_, i) => i !== index);
    updated.forEach((item, idx) => (item.order = idx));
    setCurrentItems(updated);
  };

  const handleSaveNavigation = async () => {
    const activeMenu = menus.find((m) => m.location === selectedLocation);
    if (!activeMenu || !activeWebsite) return;

    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/navigation/${activeMenu.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: currentItems }),
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Navigation menu "${activeMenu.name}" saved & synced live!` });
        fetchNavigation();
      } else {
        const json = await res.json();
        setStatusMessage({ type: 'error', text: json.error?.message || 'Failed to save navigation' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving navigation' });
    } finally {
      setSaving(false);
    }
  };

  if (!activeWebsite) {
    return (
      <div className="p-8">
        <EmptyState
          icon={<Compass className="w-6 h-6" />}
          title="No website selected"
          description="Select or add a website from the header to configure site navigation menus."
          actionLabel="Add Website"
          onAction={() => setAddWebsiteOpen(true)}
        />
      </div>
    );
  }

  const activeMenu = menus.find((m) => m.location === selectedLocation);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight font-display">
            Website Navigation
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Menu hierarchy, nesting, external links, and header/footer sync for <span className="font-semibold text-text-primary">{activeWebsite.domain}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNavigation}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveNavigation}
            disabled={saving}
            className="gap-1.5"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save & Sync Navigation'}
          </Button>
        </div>
      </div>

      {/* Audit-Only Capability Banner */}
      {isAuditOnly && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-semibold">Audit Only Mode:</span> Live navigation syncing to your remote site is restricted. Changes can be saved locally in the database.
            </div>
          </div>
          <Badge variant="warning" className="shrink-0 ml-2">Read-Only</Badge>
        </div>
      )}

      {/* Menu Location Tabs */}
      <div className="flex items-center gap-2 p-1 bg-surface border border-border rounded-xl w-fit">
        {[
          { key: 'primary', label: 'Primary Header Menu' },
          { key: 'footer', label: 'Footer Menu' },
          { key: 'mobile', label: 'Mobile Drawer' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleSelectLocation(tab.key)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              selectedLocation === tab.key
                ? 'bg-brand text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`p-3 text-xs flex items-center gap-2 rounded-xl border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Live Preview Strip */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs text-text-tertiary mb-3 pb-2 border-b border-border">
          <span className="font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-brand" /> Live Navigation Strip Preview
          </span>
          <span className="font-mono text-[11px] text-text-tertiary">https://{activeWebsite.domain}</span>
        </div>

        <div className="p-4 rounded-lg bg-surface-2/60 border border-border flex flex-wrap items-center justify-between gap-4">
          <div className="font-bold text-sm text-text-primary font-display flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand" />
            <span>{activeWebsite.name || activeWebsite.domain}</span>
          </div>

          <nav className="flex flex-wrap items-center gap-4 text-xs font-medium text-text-secondary">
            {currentItems.length === 0 ? (
              <span className="text-text-tertiary italic text-xs">No links in this menu</span>
            ) : (
              currentItems
                .filter((i) => !i.parentId)
                .map((item, idx) => {
                  const children = currentItems.filter((c) => c.parentId === (item.id || `temp_${idx}`));
                  return (
                    <div key={idx} className="relative group">
                      <span className="hover:text-brand cursor-pointer flex items-center gap-1">
                        {item.label}
                        {children.length > 0 && <span className="text-[10px] text-text-tertiary">▾</span>}
                      </span>
                    </div>
                  );
                })
            )}
          </nav>
        </div>
      </div>

      {/* Navigation Tree Builder & Quick Page Link Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Reorderable Tree list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Menu Links ({currentItems.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddItem()}
              className="gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Custom Link
            </Button>
          </div>

          {currentItems.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-border rounded-xl bg-surface">
              <Compass className="w-8 h-8 mx-auto mb-2 text-text-tertiary opacity-40" />
              <p className="text-xs font-semibold text-text-primary">Menu is empty</p>
              <p className="text-[11px] text-text-tertiary mt-1">Add items or click quick page links from the right panel.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {currentItems.map((item, idx) => {
                const isChild = !!item.parentId;
                return (
                  <div
                    key={item.id || idx}
                    className={`p-3 rounded-xl border bg-surface flex items-center gap-3 transition-all ${
                      isChild
                        ? 'ml-8 border-brand/30 bg-brand/5 shadow-xs'
                        : 'border-border shadow-sm'
                    }`}
                  >
                    {isChild && (
                      <CornerDownRight className="w-4 h-4 text-brand shrink-0" />
                    )}

                    {/* Order Index */}
                    <span className="w-5 h-5 rounded bg-surface-2 text-text-secondary text-[11px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    {/* Label Input */}
                    <div className="flex-1 min-w-[120px]">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => handleUpdateItem(idx, 'label', e.target.value)}
                        placeholder="Link Label"
                        className="w-full px-2.5 py-1 text-xs bg-surface border border-border rounded text-text-primary font-medium focus:outline-none focus:border-brand"
                      />
                    </div>

                    {/* URL Input */}
                    <div className="flex-1 min-w-[120px]">
                      <input
                        type="text"
                        value={item.url}
                        onChange={(e) => handleUpdateItem(idx, 'url', e.target.value)}
                        placeholder="URL (e.g. /about or https://...)"
                        className="w-full px-2.5 py-1 text-xs font-mono bg-surface border border-border rounded text-text-secondary focus:outline-none focus:border-brand"
                      />
                    </div>

                    {/* Target Selector */}
                    <select
                      value={item.target}
                      onChange={(e) => handleUpdateItem(idx, 'target', e.target.value)}
                      className="px-2 py-1 text-[11px] bg-surface border border-border rounded text-text-tertiary focus:outline-none"
                    >
                      <option value="_self">Same tab</option>
                      <option value="_blank">New tab</option>
                    </select>

                    {/* Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-surface-2 text-text-tertiary hover:text-text-primary disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === currentItems.length - 1}
                        className="p-1 rounded hover:bg-surface-2 text-text-tertiary hover:text-text-primary disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleNesting(idx)}
                        disabled={idx === 0}
                        className={`p-1 rounded text-xs ${
                          isChild ? 'text-brand font-bold bg-brand/10' : 'text-text-tertiary hover:text-text-primary hover:bg-surface-2'
                        } disabled:opacity-30`}
                        title={isChild ? 'Un-nest (make top level)' : 'Nest under previous item'}
                      >
                        <CornerDownRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(idx)}
                        className="p-1 rounded text-text-tertiary hover:text-rose-500 hover:bg-rose-500/10"
                        title="Delete Link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Add Managed Pages */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-surface shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-brand" /> Link Existing Pages
            </h3>
            <p className="text-[11px] text-text-tertiary">
              Click any managed page below to quickly append it to this navigation menu:
            </p>

            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {availablePages.length === 0 ? (
                <div className="text-xs text-text-tertiary py-3 text-center">No managed pages found.</div>
              ) : (
                availablePages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleAddItem(p.slug, p.title)}
                    className="w-full text-left p-2.5 rounded-lg border border-border/80 hover:border-brand/40 hover:bg-brand/5 transition-all group flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-text-primary group-hover:text-brand transition-colors">
                        {p.title}
                      </div>
                      <div className="font-mono text-[10px] text-text-tertiary">{p.slug}</div>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-text-tertiary group-hover:text-brand" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
