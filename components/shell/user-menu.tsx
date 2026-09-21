'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Shield, Building, LogOut, ChevronDown } from 'lucide-react';
import { useShell } from './context';

export const UserMenu: React.FC = () => {
  const { user } = useShell();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    } finally {
      router.push('/login');
    }
  };

  const initial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-md hover:bg-surface-2 transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <div className="w-7 h-7 rounded-full bg-accent-soft text-accent-soft-text font-display font-semibold text-xs flex items-center justify-center border border-accent/20">
          {initial}
        </div>
        <div className="hidden lg:flex flex-col text-left">
          <span className="font-display font-semibold text-xs text-text-primary truncate max-w-[120px]">
            {user?.email}
          </span>
          <span className="text-[10px] text-text-tertiary font-mono uppercase">
            {user?.role}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-text-tertiary hidden lg:block" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-56 bg-surface border border-border rounded-lg shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-text-primary font-display truncate">
              {user?.email}
            </p>
            <p className="text-[11px] text-text-tertiary truncate">
              {user?.organizationName} • {user?.role}
            </p>
          </div>

          <div className="py-1">
            <Link
              href="/settings/security"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs text-text-primary hover:bg-surface-2 transition-colors"
            >
              <Shield className="w-4 h-4 text-text-tertiary" />
              <span>Profile & Security</span>
            </Link>

            {user?.role === 'OWNER' && (
              <Link
                href="/settings/organization"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-text-primary hover:bg-surface-2 transition-colors"
              >
                <Building className="w-4 h-4 text-text-tertiary" />
                <span>Organization Settings</span>
              </Link>
            )}
          </div>

          <div className="border-t border-border pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-critical hover:bg-critical-soft/40 transition-colors text-left"
            >
              <LogOut className="w-4 h-4 text-critical" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
