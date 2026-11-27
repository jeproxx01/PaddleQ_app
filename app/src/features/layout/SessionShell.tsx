'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { db, type Session } from '@/db/db';
import { SessionIdContext } from './SessionContext';
import { SessionSidebar } from './SessionSidebar';

export function SessionShell({
  sessionId,
  children,
}: {
  sessionId: string;
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const pathname = usePathname();

  // The Broadcast Screen (/show) renders full-screen without sidebar chrome
  const isBroadcast = pathname?.endsWith('/show');

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    db.sessions.get(sessionId).then((s) => {
      if (!cancelled) setSession(s ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (isBroadcast) {
    return (
      <SessionIdContext.Provider value={sessionId}>
        <main className="h-screen w-screen bg-obsidian-dark text-white overflow-y-auto">
          {children}
        </main>
      </SessionIdContext.Provider>
    );
  }

  return (
    <SessionIdContext.Provider value={sessionId}>
      <div className="flex h-screen w-screen bg-obsidian-dark text-white">
        <Suspense fallback={<div className="w-16 shrink-0 border-r border-card-border" />}>
          <SessionSidebar
            sessionId={sessionId}
            sessionName={session?.name}
            status={session?.status}
          />
        </Suspense>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </SessionIdContext.Provider>
  );
}
