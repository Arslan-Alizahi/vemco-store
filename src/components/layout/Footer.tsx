import Link from 'next/link'
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from 'lucide-react'
import { runQuery } from '@/lib/db'
import type { SocialMediaLink } from '@/types/social-media'
import Container from './Container'
import Logo from './Logo'

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
export default function Footer() {
  let socialLinks: SocialMediaLink[] = []
  try {
    socialLinks = runQuery<SocialMediaLink>(
      `SELECT * FROM social_media_links WHERE is_active = 1 ORDER BY display_order ASC`
    )
  } catch (error) {
    console.error('Failed to load social links:', error)
  }

  return (
    <footer className="mt-auto border-t border-border-subtle bg-bark-900 text-bark-300">
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
                href="mailto:hello@vemco.pk"
                className="flex items-center gap-3 rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel-400"
              >
                <Mail className="h-4 w-4 shrink-0 text-caramel-400" aria-hidden="true" />
                hello@vemco.pk
              </a>
              <a
                href="tel:+924235000000"
                className="flex items-center gap-3 rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel-400"
              >
                <Phone className="h-4 w-4 shrink-0 text-caramel-400" aria-hidden="true" />
                +92 42 3500 0000
              </a>
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-caramel-400" aria-hidden="true" />
                <span>
                  Showroom 14, Gulberg III
                  <br />
                  Lahore, Punjab
                </span>
              </p>
            </div>
          </div>

          {SECTIONS.map(section => (
            <nav key={section.title} aria-label={section.title}>
              <h2 className="mb-4 text-caption uppercase tracking-[0.06em] text-bark-400">
                {section.title}
              </h2>
              <ul className="space-y-2.5">
                {section.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="rounded-sm text-ui transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel-400"
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

      <div className="border-t border-bark-800">
        <Container className="flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
          <p className="text-caption text-bark-400">
            © {new Date().getFullYear()} VEMCO. All rights reserved.
          </p>

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
                      aria-label={`VEMCO on ${link.platform}`}
                      className="flex h-11 w-11 items-center justify-center rounded-sm text-bark-400 transition-colors hover:bg-bark-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel-400"
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
  )
}
