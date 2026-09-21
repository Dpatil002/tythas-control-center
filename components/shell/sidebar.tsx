'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  BookOpen,
  Image,
  Menu as MenuIcon,
  CheckSquare,
  Users,
  Search,
  Code2,
  Cpu,
  ArrowRightLeft,
  Activity,
  Layers,
  Share2,
  Settings,
  Building2,
} from 'lucide-react';
import { useShell } from './context';

interface NavItemProps {
  label: string;
  href: string;
  icon: React.ReactNode;
  isActive?: boolean;
  phaseBadge?: string;
  disabled?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
  label,
  href,
  icon,
  isActive = false,
  phaseBadge,
  disabled = false,
}) => {
  if (disabled) {
    return (
      <div
        className="flex items-center justify-between px-3 py-2 rounded-lg text-sidebar-text-dim/60 text-xs select-none cursor-not-allowed group transition-all"
        title="Coming in a future phase"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 opacity-50 group-hover:opacity-75 transition-opacity">{icon}</span>
          <span className="font-medium font-display">{label}</span>
        </div>
        {phaseBadge && (
          <span className="text-[9px] font-mono font-medium tracking-wider bg-white/5 text-sidebar-text-dim/80 px-1.5 py-0.5 rounded border border-white/5">
            {phaseBadge}
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`
        group relative flex items-center justify-between px-3 py-2 rounded-lg text-xs font-display font-medium transition-all duration-150
        ${
          isActive
            ? 'bg-gradient-to-r from-accent/20 to-accent/5 text-white font-semibold shadow-sm border border-accent/30'
            : 'text-sidebar-text hover:bg-white/[0.06] hover:text-white'
        }
      `}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent rounded-r-full shadow-[0_0_8px_rgba(91,141,255,0.6)]" />
      )}
      <div className="flex items-center gap-2.5">
        <span className={`transition-colors ${isActive ? 'text-accent-light' : 'text-sidebar-text-dim group-hover:text-white'}`}>
          {icon}
        </span>
        <span>{label}</span>
      </div>
    </Link>
  );
};

export const Sidebar: React.FC<{ isMobile?: boolean; onCloseMobile?: () => void }> = ({
  isMobile = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const { user } = useShell();

  return (
    <aside
      className={`
        w-[236px] bg-sidebar-bg text-sidebar-text flex flex-col flex-shrink-0 select-none
        ${isMobile ? 'h-full' : 'h-screen border-r border-sidebar-border sticky top-0 hidden md:flex'}
      `}
    >
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center gap-2.5 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-white font-display font-bold text-sm shadow-md">
          T
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-sm text-white tracking-tight">
            TYTHAS
          </span>
          <span className="text-[10px] text-sidebar-text-dim uppercase tracking-wider font-mono">
            Control Center
          </span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Overview */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-sidebar-text-dim">
            Overview
          </div>
          <NavItem
            label="Dashboard"
            href="/dashboard"
            icon={<LayoutDashboard className="w-4 h-4" />}
            isActive={pathname === '/dashboard'}
          />
          <NavItem
            label="Website Analysis"
            href="/analysis"
            icon={<BarChart3 className="w-4 h-4" />}
            isActive={pathname.startsWith('/analysis') || pathname.includes('/analysis')}
          />
        </div>

        {/* Website Module */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-sidebar-text-dim">
            Website
          </div>
          <NavItem
            label="Pages"
            href="/pages"
            icon={<FileText className="w-4 h-4" />}
            isActive={pathname === '/pages' || pathname.startsWith('/pages/')}
          />
          <NavItem
            label="Blog"
            href="/blog"
            icon={<BookOpen className="w-4 h-4" />}
            isActive={pathname === '/blog' || pathname.startsWith('/blog/')}
          />
          <NavItem
            label="Media"
            href="/media"
            icon={<Image className="w-4 h-4" />}
            isActive={pathname === '/media' || pathname.startsWith('/media/')}
          />
          <NavItem
            label="Navigation"
            href="/navigation"
            icon={<MenuIcon className="w-4 h-4" />}
            isActive={pathname === '/navigation' || pathname.startsWith('/navigation/')}
          />
          <NavItem
            label="Forms"
            href="/forms"
            icon={<CheckSquare className="w-4 h-4" />}
            isActive={pathname === '/forms' || pathname.startsWith('/forms/')}
          />
          <NavItem
            label="Leads"
            href="/leads"
            icon={<Users className="w-4 h-4" />}
            isActive={pathname === '/leads' || pathname.startsWith('/leads/')}
          />
        </div>

        {/* SEO Module */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-sidebar-text-dim">
            SEO
          </div>
          <NavItem
            label="SEO"
            href="/seo"
            icon={<Search className="w-4 h-4" />}
            isActive={pathname === '/seo' || pathname.startsWith('/seo/') || pathname.includes('/seo')}
          />
          <NavItem
            label="Schema"
            href="/schema"
            icon={<Code2 className="w-4 h-4" />}
            isActive={pathname === '/schema' || pathname.startsWith('/schema/') || pathname.includes('/schema')}
          />
          <NavItem
            label="Technical SEO"
            href="/technical-seo"
            icon={<Cpu className="w-4 h-4" />}
            isActive={pathname === '/technical-seo' || pathname.startsWith('/technical-seo/') || pathname.includes('/technical-seo')}
          />
          <NavItem
            label="Redirects"
            href="/redirects"
            icon={<ArrowRightLeft className="w-4 h-4" />}
            isActive={pathname === '/redirects' || pathname.startsWith('/redirects/') || pathname.includes('/redirects')}
          />
        </div>

        {/* Integrations & Operations */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-sidebar-text-dim">
            Integrations & Health
          </div>
          <NavItem
            label="Integrations"
            href="/integrations"
            icon={<Share2 className="w-4 h-4" />}
            isActive={pathname.startsWith('/integrations')}
          />
          <NavItem
            label="Monitoring"
            href="/monitoring"
            icon={<Activity className="w-4 h-4" />}
            isActive={pathname.startsWith('/monitoring')}
          />
        </div>

        {/* Settings */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-sidebar-text-dim">
            Settings
          </div>
          <NavItem
            label="Website Settings"
            href="/settings/website"
            icon={<Settings className="w-4 h-4" />}
            isActive={pathname.startsWith('/settings/website')}
          />
          {user?.role === 'OWNER' && (
            <NavItem
              label="Organization"
              href="/settings/organization"
              icon={<Building2 className="w-4 h-4" />}
              isActive={pathname.startsWith('/settings/organization')}
            />
          )}
        </div>
      </div>

      {/* Footer Org Badge */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar-bg/60">
        <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-sidebar-bg-hover text-sidebar-text-dim">
          <span className="truncate max-w-[120px]">{user?.organizationName || 'Tythas'}</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sidebar-bg-active text-sidebar-text">
            {user?.role || 'MANAGER'}
          </span>
        </div>
      </div>
    </aside>
  );
};
