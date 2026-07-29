import AdminShell from '@/components/layout/AdminShell'

/**
 * Admin chrome, for the signed-in screens only.
 *
 * A route group rather than a path segment, so the URLs stay /admin and
 * /admin/revenue while /admin/login sits outside this layout and renders
 * without a navigation bar it cannot yet use.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
