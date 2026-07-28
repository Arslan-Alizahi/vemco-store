import { AdminAuth } from '@/components/ui/AdminAuth'
import AdminShell from '@/components/layout/AdminShell'

export const dynamic = 'force-dynamic'

/**
 * Wraps every admin route once, instead of each page importing AdminAuth and
 * the storefront Navbar for itself.
 *
 * AdminAuth remains a client-side gate with a hardcoded password. It is not
 * real authentication and is documented as such -- see the design spec. This
 * layout only stops it being pasted into three separate pages.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuth>
      <AdminShell>{children}</AdminShell>
    </AdminAuth>
  )
}
