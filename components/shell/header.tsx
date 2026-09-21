'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
} from 'lucide-react';
import { WebsiteSwitcher } from './website-switcher';
import { UserMenu } from './user-menu';
import { CommandPalette } from './command-palette';
import { Drawer } from '@/components/ui/drawer';
import { Sidebar } from './sidebar';
import { useShell } from './context';
import { Button } from '@/components/ui/button';

export const Header: React.FC = () => {
  const router = useRouter();
  const { theme, toggleTheme, setCommandPaletteOpen, setAddWebsiteOpen } = useShell();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?unread=true&limit=5');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || data.data?.notifications || []);
        setUnreadCount(data.counts?.unread ?? data.data?.counts?.unread ?? 0);
      }
    } catch {}
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  };

  const handleNotificationClick = async (n: any) => {
    try {
      await fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.filter((item) => item.id !== n.id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setIsNotificationsOpen(false);
      if (n.linkPath) {
        router.push(n.linkPath);
      } else {
        router.push('/monitoring?tab=notifications');
      }
    } catch {}
  };

  return (
    <>
      <header className="h-14 bg-surface/90 backdrop-blur-md border-b border-border/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
        {/* Left: Mobile Menu + Website Switcher + Add Website Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-text-secondary md:hidden transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <WebsiteSwitcher />

          {/* Clearly visible primary Add Website button in the header */}
          <Button
            size="sm"
            onClick={() => setAddWebsiteOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-display font-semibold bg-accent hover:bg-accent-hover text-white shadow-xs rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Website</span>
          </Button>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Search trigger (⌘K) */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-border/80 bg-surface-2/50 hover:bg-surface-2 hover:border-border text-text-tertiary hover:text-text-secondary text-xs transition-all shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search or jump to...</span>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary bg-surface border border-border/80 rounded shadow-xs">
              ⌘K
            </kbd>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-critical opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-critical" />
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-xl p-4 z-40 animate-in fade-in zoom-in-95 duration-100 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-xs text-text-primary">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-critical-soft text-critical font-bold">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-accent hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-border/60 -mx-1 px-1">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className="py-2.5 px-2 hover:bg-surface-2/60 rounded-lg cursor-pointer transition-colors space-y-0.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-display font-semibold text-text-primary truncate">
                            {n.title}
                          </span>
                          <span className="text-[10px] font-mono text-text-tertiary flex-shrink-0">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-text-secondary text-[11px] line-clamp-2 leading-relaxed">
                          {n.detail}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-text-tertiary">
                      No unread notifications.
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border flex justify-center">
                  <Link
                    href="/monitoring?tab=notifications"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-xs text-accent hover:underline font-semibold font-display"
                  >
                    View all notifications →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle (Light / Dark) */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-warning" />}
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* User Menu */}
          <UserMenu />
        </div>
      </header>

      {/* Mobile Sidebar Drawer */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        title="Navigation"
      >
        <Sidebar isMobile onCloseMobile={() => setIsMobileMenuOpen(false)} />
      </Drawer>

      {/* Command Palette */}
      <CommandPalette />
    </>
  );
};
