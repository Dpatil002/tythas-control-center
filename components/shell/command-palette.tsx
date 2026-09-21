'use client';

import React, { useState } from 'react';
import { Search, Command, Globe, LayoutDashboard, Settings } from 'lucide-react';
import { useShell } from './context';
import { Modal } from '@/components/ui/modal';
import { useRouter } from 'next/navigation';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    accessibleWebsites,
    setActiveWebsite,
    user,
  } = useShell();

  const [query, setQuery] = useState('');
  const router = useRouter();

  if (!isCommandPaletteOpen) return null;

  const filteredWebsites = accessibleWebsites.filter(
    (w) =>
      w.name.toLowerCase().includes(query.toLowerCase()) ||
      w.domain.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Modal
      isOpen={isCommandPaletteOpen}
      onClose={() => setCommandPaletteOpen(false)}
      maxWidth="lg"
    >
      <div className="-m-6">
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3 border-b border-border bg-surface">
          <Search className="w-5 h-5 text-text-tertiary mr-3" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search websites..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-text-tertiary bg-surface-2 border border-border rounded">
            ESC
          </kbd>
        </div>

        {/* Command Groups */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {/* Websites section */}
          <div>
            <div className="px-3 py-1.5 text-[10px] font-mono font-semibold uppercase text-text-tertiary">
              Switch Website
            </div>
            {filteredWebsites.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text-tertiary">
                No matching websites found.
              </div>
            ) : (
              filteredWebsites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => {
                    setActiveWebsite(site);
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-md hover:bg-surface-2 text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-text-tertiary" />
                    <div>
                      <span className="font-display font-medium text-text-primary block">
                        {site.name}
                      </span>
                      <span className="font-mono text-[10px] text-text-tertiary">
                        {site.domain}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-text-tertiary uppercase">
                    {site.connectionState}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <div className="px-3 py-1.5 text-[10px] font-mono font-semibold uppercase text-text-tertiary">
              Navigation
            </div>
            <button
              onClick={() => {
                router.push('/dashboard');
                setCommandPaletteOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md hover:bg-surface-2 text-left transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-text-tertiary" />
              <span className="font-display font-medium text-text-primary">
                Go to Dashboard
              </span>
            </button>
            <button
              onClick={() => {
                router.push('/settings/security');
                setCommandPaletteOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md hover:bg-surface-2 text-left transition-colors"
            >
              <Settings className="w-4 h-4 text-text-tertiary" />
              <span className="font-display font-medium text-text-primary">
                Security & Sessions
              </span>
            </button>
            {user?.role === 'OWNER' && (
              <button
                onClick={() => {
                  router.push('/settings/organization');
                  setCommandPaletteOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md hover:bg-surface-2 text-left transition-colors"
              >
                <Settings className="w-4 h-4 text-text-tertiary" />
                <span className="font-display font-medium text-text-primary">
                  Organization Settings
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-surface-2/60 text-[11px] text-text-tertiary flex items-center justify-between">
          <span>Global Search (Phase 1 Stub)</span>
          <span className="font-mono">Use ⌘K to open anytime</span>
        </div>
      </div>
    </Modal>
  );
};
