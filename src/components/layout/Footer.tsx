import Link from 'next/link'
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from 'lucide-react'
import { runQuery } from '@/lib/db'
import type { SocialMediaLink } from '@/types/social-media'
import Container from './Container'
import Logo from './Logo'
import PoweredBy from './PoweredBy'
import { BRAND_ADDRESS, BRAND_EMAIL, BRAND_NAME, BRAND_PHONES, telHref } from '@/lib/brand'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
}

const SECTIONS = [
  {
    title: 'Shop',
    links: [
      { label: 'All furniture', href: '/products' },
      { label: 'Categories', href: '/categories' },
      { label: 'Saved items', href: '/favorites' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Delivery', href: '/shipping' },
      { label: 'Returns', href: '/policies/returns' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/policies/privacy' },
      { label: 'Terms', href: '/policies/terms' },
      { label: 'Cookies', href: '/policies/cookies' },
      { label: 'Accessibility', href: '/accessibility' },
    ],
  },
]

/**
 * Site footer.
 *
 * A server component now, so social links come from the database in the first
 * response instead of a client fetch that popped in after paint. The
 * scroll-to-top button that used to live in here has moved to the shell: as a
 * child of `<footer>` it only existed on the twelve pages that rendered a
 * footer, and none of the long-scrolling ones that need it.
 */
export default async function Footer() {
  let socialLinks: SocialMediaLink[] = []
  try {
    socialLinks = await runQuery<SocialMediaLink>(
      `SELECT * FROM social_media_links WHERE is_active = 1 ORDER BY display_order ASC`
    )
  } catch (error) {
    console.error('Failed to load social links:', error)
  }

  return (
    /*
      Inset and rounded, like every other panel on the page. A full-bleed
      footer would be the one element that runs to the edges, and the reader
      notices that -- it reads as the page ending and something else
      beginning, rather than as the last panel in the stack.
    */
    <div className="mt-auto bg-canvas px-3 pb-3 sm:px-4 sm:pb-4">
    <footer className="overflow-hidden rounded-xl bg-surface-inverse text-bark-200">
      <Container className="py-section-sm">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-6 lg:gap-12">
          <div className="col-span-2">
            <Logo tone="onDark" />
            <p className="mt-4 max-w-[38ch] text-ui leading-relaxed">
              Solid wood furniture, made to last and priced without theatre.
              Delivered across Pakistan.
            </p>

            <div className="mt-6 space-y-3 text-ui">
              <a
                href={`mailto:${BRAND_EMAIL}`}
                className="flex items-center gap-3 rounded-sm transition-colors hover:text-bark-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel-300"
              >
                <Mail className="h-4 w-4 shrink-0 text-bark-300" aria-hidden="true" />
                {BRAND_EMAIL}
              </a>

              {/*
                Both lines are listed, and the icon only appears on the first.
                Repeating the handset glyph down a column reads as two
                unrelated facts; one icon over a stack reads as "these are the
                phone numbers", which is what it is.
              */}
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-bark-300" aria-hidden="true" />
                <ul className="space-y-1">
                  {BRAND_PHONES.map(phone => (
                    <li key={phone}>
                      <a
                        href={telHref(phone)}
                        className="rounded-sm transition-colors hover:text-bark-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel-300"
                      >
                        {phone}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-bark-300" aria-hidden="true" />
                <span>{BRAND_ADDRESS}</span>
              </p>
            </div>
          </div>

          {SECTIONS.map(section => (
            <nav key={section.title} aria-label={section.title}>
              <h2 className="mb-4 text-caption uppercase tracking-[0.06em] text-bark-300">
                {section.title}
              </h2>
              <ul className="space-y-2.5">
                {section.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="rounded-sm text-ui transition-colors hover:text-bark-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </Container>

      <div className="border-t border-bark-700">
        <Container className="flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <p className="text-caption text-bark-300">
              © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
            </p>
            <PoweredBy tone="inverted" />
          </div>

          {socialLinks.length > 0 && (
            <ul className="flex items-center gap-2">
              {socialLinks.map(link => {
                const Icon = ICONS[link.icon?.toLowerCase()] ?? Instagram
                return (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${BRAND_NAME} on ${link.platform}`}
                      className="flex h-11 w-11 items-center justify-center rounded-sm text-bark-300 transition-colors hover:bg-bark-700 hover:text-bark-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel-300"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </Container>
      </div>
    </footer>
    </div>
  )
}
