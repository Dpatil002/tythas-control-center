'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface WebsiteItem {
  id: string;
  name: string;
  domain: string;
  connectionState: string;
  connectorType: string;
  ownershipVerifiedAt: string | null;
  pagesFound?: number | null;
  indexableCount?: number | null;
  detectedCms?: string | null;
  detectedBuilder?: string | null;
  client?: {
    id: string;
    name: string;
  };
}

export interface UserContextData {
  id: string;
  email: string;
  role: 'OWNER' | 'MANAGER';
  organizationId: string;
  organizationName: string;
  mfaEnabled: boolean;
}

interface ShellContextType {
  activeWebsite: WebsiteItem | null;
  accessibleWebsites: WebsiteItem[];
  user: UserContextData | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setActiveWebsite: (website: WebsiteItem) => void;
  refreshWebsites: () => Promise<WebsiteItem[]>;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  isAddWebsiteOpen: boolean;
  setAddWebsiteOpen: (open: boolean) => void;
}

const ShellContext = createContext<ShellContextType | undefined>(undefined);

export function ShellProvider({
  children,
  initialUser,
  initialWebsites = [],
  initialActiveWebsite = null,
}: {
  children: React.ReactNode;
  initialUser: UserContextData | null;
  initialWebsites?: WebsiteItem[];
  initialActiveWebsite?: WebsiteItem | null;
}) {
  const [user] = useState<UserContextData | null>(initialUser);
  const [accessibleWebsites, setAccessibleWebsites] = useState<WebsiteItem[]>(initialWebsites);
  const [activeWebsite, setActiveWebsiteState] = useState<WebsiteItem | null>(initialActiveWebsite || (initialWebsites[0] || null));
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isAddWebsiteOpen, setAddWebsiteOpen] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('tythas_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('tythas_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const setActiveWebsite = (website: WebsiteItem) => {
    setActiveWebsiteState(website);
    document.cookie = `tythas_active_website=${website.id}; path=/; max-age=2592000; SameSite=Lax`;
  };

  const refreshWebsites = async (): Promise<WebsiteItem[]> => {
    try {
      const res = await fetch('/api/websites');
      if (res.ok) {
        const data = await res.json();
        const sites: WebsiteItem[] = data.data?.websites || [];
        setAccessibleWebsites(sites);
        if (sites.length > 0 && !activeWebsite) {
          setActiveWebsite(sites[0]);
        }
        return sites;
      }
    } catch (e) {
      console.error('Failed to refresh websites:', e);
    }
    return [];
  };

  // ⌘K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ShellContext.Provider
      value={{
        activeWebsite,
        accessibleWebsites,
        user,
        theme,
        toggleTheme,
        setActiveWebsite,
        refreshWebsites,
        isCommandPaletteOpen,
        setCommandPaletteOpen,
        isAddWebsiteOpen,
        setAddWebsiteOpen,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error('useShell must be used within a ShellProvider');
  }
  return context;
}
