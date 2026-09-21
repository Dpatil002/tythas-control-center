'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, Globe } from 'lucide-react';
import { useShell } from './context';
import { Badge } from '@/components/ui/badge';
import { AddWebsiteModal } from '@/components/websites/add-website-modal';

export const WebsiteSwitcher: React.FC = () => {
  const {
    activeWebsite,
    accessibleWebsites,
    setActiveWebsite,
    setAddWebsiteOpen,
  } = useShell();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Switcher Button & Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-md border border-border bg-surface hover:bg-surface-2 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-xs text-text-primary truncate max-w-[140px] sm:max-w-[180px]">
                {activeWebsite ? activeWebsite.name : 'Select Website'}
              </span>
              {activeWebsite && (
                <Badge
                  variant={activeWebsite.connectionState as any}
                  size="sm"
                  showDot
                >
                  {activeWebsite.connectionState.replace('_', ' ')}
                </Badge>
              )}
            </div>
            {activeWebsite && (
              <span className="font-mono text-[11px] text-text-tertiary truncate max-w-[160px]">
                {activeWebsite.domain}
              </span>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-text-tertiary transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-1.5 w-72 bg-surface border border-border rounded-lg shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-text-tertiary font-semibold tracking-wider border-b border-border">
              Verified Websites ({accessibleWebsites.length})
            </div>

            <div className="max-h-60 overflow-y-auto py-1">
              {accessibleWebsites.length === 0 ? (
                <div className="px-3 py-4 text-xs text-center text-text-tertiary">
                  No verified websites available.
                </div>
              ) : (
                accessibleWebsites.map((site) => {
                  const isSelected = activeWebsite?.id === site.id;
                  return (
                    <button
                      key={site.id}
                      onClick={() => {
                        setActiveWebsite(site);
                        setIsOpen(false);
                      }}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors
                        ${
                          isSelected
                            ? 'bg-accent-soft text-text-primary font-medium'
                            : 'hover:bg-surface-2 text-text-secondary'
                        }
                      `}
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="font-display font-semibold text-text-primary truncate">
                          {site.name}
                        </span>
                        <span className="font-mono text-[11px] text-text-tertiary truncate">
                          {site.domain}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge variant={site.connectionState as any} size="sm" showDot>
                          {site.connectionState.toLowerCase().replace('_', ' ')}
                        </Badge>
                        {isSelected && <Check className="w-4 h-4 text-accent ml-1" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Add Website action trigger */}
            <div className="border-t border-border pt-1 px-1.5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setAddWebsiteOpen(true);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-display font-semibold text-accent hover:bg-accent-soft rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add website</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5-Step Guided Add Website Modal */}
      <AddWebsiteModal />
    </>
  );
};
