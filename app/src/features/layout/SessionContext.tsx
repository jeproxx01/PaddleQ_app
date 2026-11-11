'use client';

import { createContext, useContext } from 'react';

export const SessionIdContext = createContext<string | null>(null);

export function useSessionId(): string {
  const id = useContext(SessionIdContext);
  if (id === null) {
    throw new Error('useSessionId must be used within a SessionShell');
  }
  return id;
}
