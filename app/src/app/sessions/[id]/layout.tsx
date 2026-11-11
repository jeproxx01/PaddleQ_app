import { SessionShell } from '@/features/layout/SessionShell';

// The session subtree is fully client-rendered (IndexedDB data), so it is not
// expected to prerender a static shell. Allow it to block (render on request).
export const instant = false;

export default async function SessionLayout({
  children,
  params,
}: LayoutProps<'/sessions/[id]'>) {
  const { id } = await params;
  return <SessionShell sessionId={id}>{children}</SessionShell>;
}
