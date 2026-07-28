import StorefrontShell from '@/components/layout/StorefrontShell'

// The shell reads navigation from SQLite, which cannot be prerendered at
// build time.
export const dynamic = 'force-dynamic'

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>
}
