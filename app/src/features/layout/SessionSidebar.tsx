'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Home, ListOrdered, Users, History, BarChart3, Settings, Tv } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Sessions', href: '/', icon: LayoutGrid },
  { label: 'Lobby', href: '/lobby', icon: Home },
  { label: 'Queue', href: '/queue', icon: ListOrdered },
  { label: 'Players', href: '/players', icon: Users },
  { label: 'History', href: '/history', icon: History },
  { label: 'Summary', href: '/summary', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Show', href: '/show', icon: Tv },
];

interface SessionSidebarProps {
  sessionId: string;
  sessionName?: string;
  status?: string;
}

export function SessionSidebar({ sessionId, sessionName, status }: SessionSidebarProps) {
  const pathname = usePathname();
  const base = `/sessions/${sessionId}`;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === `${base}${href}`;
  };

  return (
    <aside className="w-16 shrink-0 h-screen bg-obsidian-dark border-r border-card-border flex flex-col items-center py-4 gap-2">
      {/* Logo → courts view */}
      <Link
        href={base}
        className="w-11 h-11 mb-2 flex items-center justify-center rounded-xl bg-volt text-obsidian-dark font-black text-lg"
        title="PaddleQ courts"
      >
        P
      </Link>

      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href === '/' ? '/' : `${base}${item.href}`}
            title={item.label}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              active
                ? 'bg-volt/15 text-volt border border-volt/40'
                : 'text-text-secondary hover:text-white hover:bg-card-surface border border-transparent'
            }`}
          >
            <Icon className="w-5 h-5" />
          </Link>
        );
      })}

      {/* Status indicator at the bottom */}
      <div className="mt-auto flex flex-col items-center gap-1">
        {sessionName && (
          <span
            title={sessionName}
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: status === 'live' ? '#ccff00' : '#ff8a00' }}
          />
        )}
      </div>
    </aside>
  );
}
