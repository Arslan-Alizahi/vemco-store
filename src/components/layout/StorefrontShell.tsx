import { getHeaderNav } from '@/lib/nav'
import AppFrame from './AppFrame'
import Navbar from './Navbar'
import Footer from './Footer'
import ScrollToTop from './ScrollToTop'

/**
 * Customer-facing chrome.
 *
 * A server component, so the navigation is read from the database during
 * render and arrives in the first HTML response. Every storefront route gets
 * this from one layout file, replacing eighteen hand-pasted Navbar imports and
 * twelve Footer imports -- six pages had neither, including the product detail
 * page, where Add to Cart had no visible consequence and no route to checkout.
 */
export default function StorefrontShell({ children }: { children: React.ReactNode }) {
  const links = getHeaderNav()

  return (
    <AppFrame header={<Navbar links={links} />} footer={<Footer />}>
      {children}
      <ScrollToTop />
    </AppFrame>
  )
}
