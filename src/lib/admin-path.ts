/**
 * Where the staff screens are served from.
 *
 * A customer who types `/admin` should find nothing there -- not a login box
 * that tells them a panel exists and invites them to guess at it, but the
 * same 404 they would get for any other address that is not a page.
 *
 * Be clear about what this is worth. Moving the door does not lock it: the
 * password, the signed session cookie and the login rate limit are what keep
 * people out, and none of them depends on the path being secret. What this
 * buys is that the door is not advertised -- automated scanners sweeping
 * `/admin`, `/wp-admin`, `/administrator` across the whole internet find
 * nothing, and neither does a curious customer. That is worth having, and it
 * is not a substitute for a real password.
 *
 * `NEXT_PUBLIC_` because the browser builds these links too. There is no
 * secret in the bundle that is not already in the URL bar of anybody using
 * the panel.
 */
/**
 * Read on every call rather than captured once at module load.
 *
 * Next replaces `process.env.NEXT_PUBLIC_*` textually at build time, so this
 * costs nothing in the shipped bundle -- and it means a test can set the
 * value and see it take effect, instead of the whole suite being at the mercy
 * of whatever happens to be in the developer's .env.local. Held as a const,
 * these tests passed or failed depending on a file that is not in the
 * repository, which is the worst kind of green.
 *
 * No slashes, no spaces, no empty string: a bad value must not open `/`.
 */
export const adminPath = (): string =>
  (process.env.NEXT_PUBLIC_ADMIN_PATH || 'admin').replace(/^\/+|\/+$/g, '').trim() || 'admin'

/**
 * True when the shop has moved the panel somewhere of its own.
 *
 * While this is false nothing is masked, so a developer running the app with
 * no configuration keeps `/admin` and `/billing` exactly where they expect.
 */
export const adminPathIsCustom = (): boolean => adminPath() !== 'admin'

/**
 * A link to a staff screen: `adminUrl('/customers')`.
 *
 * Every internal link goes through this. A hardcoded `/admin/customers`
 * anywhere would 404 the moment the shop set a path of its own, and it would
 * do it silently -- the link would simply stop working for the one person
 * who uses it every day.
 */
export const adminUrl = (path = ''): string => {
  const suffix = path && !path.startsWith('/') ? `/${path}` : path
  return `/${adminPath()}${suffix}`
}

/** The till, which lives under the same prefix so it is hidden too. */
export const posUrl = (): string => adminUrl('/billing')

/**
 * The real route behind a public staff URL.
 *
 * `/office-x7/customers` is served by `src/app/admin/(dashboard)/customers`,
 * and `/office-x7/billing` by `src/app/billing` -- the till is a top-level
 * route rather than part of the admin section, so it is mapped by name.
 */
export const internalStaffPath = (publicPath: string): string | null => {
  if (!adminPathIsCustom()) return null

  const prefix = `/${adminPath()}`
  if (publicPath === prefix) return '/admin'
  if (!publicPath.startsWith(`${prefix}/`)) return null

  const rest = publicPath.slice(prefix.length + 1)
  return rest === 'billing' || rest.startsWith('billing/') ? `/${rest}` : `/admin/${rest}`
}
