export const dynamic = 'force-dynamic'

/**
 * Everything under /admin, including the login screen.
 *
 * Deliberately bare. The chrome lives one level down in (dashboard), because
 * the login page must not render a navigation bar full of links to places the
 * visitor cannot yet reach.
 *
 * There is no gate here either. It used to wrap AdminAuth, a client component
 * comparing a typed password against a literal in the bundle. That check is
 * middleware now, which runs before the request reaches any of this and --
 * unlike a layout -- also covers the API routes underneath. A layout can only
 * hide a page; the data was reachable regardless.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
