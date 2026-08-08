import { runDelete, runGet, runInsert, runTransaction, type Sql } from './index'

/**
 * VEMCO demo catalogue -- furniture, priced in PKR for the Pakistani market.
 *
 * Every seeded row is recorded in the `demo_seed` ledger, so clearing demo
 * data removes exactly what the seeder created and never touches rows an
 * operator added themselves.
 *
 * Images are real photographs processed by scripts/prepare-seed-images.mjs
 * into 4:5 crops at two widths in AVIF, WebP and JPEG. They are stock images,
 * not VEMCO's own product shots -- see public/seed/products/CREDITS.md.
 */

// Cards load the small crop; the detail page gets the large one as a second
// image. Phase 5 replaces both with next/image and a proper srcset.
export const SMALL = (slug: string) => `/seed/products/${slug}-sm.webp`
export const LARGE = (slug: string) => `/seed/products/${slug}-lg.webp`

export const categories = [
  { slug: 'sofas-seating', name: 'Sofas & Seating', description: 'Sofas, armchairs and lounge seating for the room you actually live in.' },
  { slug: 'beds-bedroom', name: 'Beds & Bedroom', description: 'Beds, bedsides and wardrobes built for real Pakistani room sizes.' },
  { slug: 'dining', name: 'Dining', description: 'Tables and chairs that take daily use and a full family gathering.' },
  { slug: 'tables', name: 'Tables', description: 'Coffee, side and console tables in solid sheesham, walnut and oak.' },
  { slug: 'storage', name: 'Storage', description: 'Wardrobes, sideboards and media units with real carcass construction.' },
]

export interface SeedProduct {
  slug: string
  name: string
  category: string
  sku: string
  price: number
  compare_at_price: number | null
  cost_price: number
  stock_quantity: number
  is_featured: 0 | 1
  description: string
  long_description: string
}

/** Prices are PKR. Furniture-retail realistic for Lahore/Karachi. */
export const products: SeedProduct[] = [
  {
    slug: 'emerald-velvet-sofa',
    name: 'Emerald Velvet Three-Seater',
    category: 'sofas-seating',
    sku: 'VMC-SOF-101',
    price: 168000,
    compare_at_price: 195000,
    cost_price: 96000,
    stock_quantity: 6,
    is_featured: 1,
    description: 'Cotton-velvet three-seater on solid sheesham legs, with a single bench cushion.',
    long_description:
      'A single bench seat instead of split cushions, so nothing sags into a gap in the middle after a year. Frame is kiln-dried sheesham, corner-blocked and dowelled. Cover is a cotton-backed velvet at 45,000 Martindale, which is a commercial-grade rub count — it will outlast the room. Bolster cushions included. 210cm wide, 92cm deep, seat height 45cm. Legs unscrew for stairwells.',
  },
  {
    slug: 'terracotta-linen-sofa',
    name: 'Terracotta Linen Three-Seater',
    category: 'sofas-seating',
    sku: 'VMC-SOF-102',
    price: 142000,
    compare_at_price: null,
    cost_price: 82000,
    stock_quantity: 9,
    is_featured: 1,
    description: 'Textured linen-blend in warm terracotta, with feather-wrapped foam cushions.',
    long_description:
      'High-resilience foam wrapped in feather, so the cushions keep their shape but still give when you sit. The linen blend is loose-woven and breathable, which matters through a Lahore summer. Covers unzip for dry cleaning. 205cm wide, 90cm deep. Also available in sand and olive on a 3-week order.',
  },
  {
    slug: 'classic-sofa-set',
    name: 'Meridian 3+1+1 Sofa Set',
    category: 'sofas-seating',
    sku: 'VMC-SOF-103',
    price: 298000,
    compare_at_price: 345000,
    cost_price: 172000,
    stock_quantity: 4,
    is_featured: 1,
    description: 'A full drawing-room set — one three-seater and two matching armchairs.',
    long_description:
      'The traditional Pakistani drawing-room arrangement, done properly. Sheesham frames with sinuous spring suspension rather than webbing, which is the part that decides whether a sofa is still comfortable in year five. Sold as a set of three pieces. Three-seater 200cm, armchairs 92cm each. Fabric protection treatment included.',
  },
  {
    slug: 'suede-two-seater',
    name: 'Kashmir Suede Two-Seater',
    category: 'sofas-seating',
    sku: 'VMC-SOF-104',
    price: 96000,
    compare_at_price: null,
    cost_price: 55000,
    stock_quantity: 11,
    is_featured: 0,
    description: 'A compact loveseat in soft suede with exposed sheesham arms.',
    long_description:
      'Sized for a flat or a small sitting room where a full three-seater would swallow the floor. Exposed sheesham arm caps and base rail, hand-finished. Faux-suede upholstery wipes clean, which is the sensible choice with children. 150cm wide, 85cm deep.',
  },
  {
    slug: 'modular-lounge-sofa',
    name: 'Atrium Modular Lounge Sofa',
    category: 'sofas-seating',
    sku: 'VMC-SOF-105',
    price: 232000,
    compare_at_price: null,
    cost_price: 134000,
    stock_quantity: 3,
    is_featured: 0,
    description: 'Three units that reconfigure — L-shape, straight run, or split seating.',
    long_description:
      'Three separate upholstered units with hidden connectors, so the same sofa works as an L against a corner or a straight run along a wall, and comes apart to get up a narrow staircase. Wool-blend upholstery in dove grey. Each unit 90 × 90cm. Add or remove units later; they stay in production.',
  },
  {
    slug: 'mustard-accent-chair',
    name: 'Marigold Accent Chair',
    category: 'sofas-seating',
    sku: 'VMC-CHR-201',
    price: 48000,
    compare_at_price: 56000,
    cost_price: 27000,
    stock_quantity: 16,
    is_featured: 1,
    description: 'A mustard linen occasional chair on tapered black legs.',
    long_description:
      'The chair that finishes a corner. Sprung seat rather than foam-on-ply, so it does not go flat. Tapered solid-wood legs in a black stain. Compact enough at 72cm wide to fit a bedroom corner or beside a sofa without crowding it. Also stocked in forest green.',
  },
  {
    slug: 'amber-swivel-chair',
    name: 'Amber Swivel Lounge Chair',
    category: 'sofas-seating',
    sku: 'VMC-CHR-202',
    price: 72000,
    compare_at_price: null,
    cost_price: 41000,
    stock_quantity: 8,
    is_featured: 0,
    description: 'Channel-stitched velvet on a 360° swivel base.',
    long_description:
      'Channel stitching across the back and arms, which holds the shape of the padding instead of letting it migrate. Full 360° swivel on a weighted steel base — useful in a room where the seating faces two ways. Deep enough to curl into at 88cm. Velvet is stain-resistant treated.',
  },
  {
    slug: 'curved-upholstered-bed',
    name: 'Aria Curved King Bed',
    category: 'beds-bedroom',
    sku: 'VMC-BED-301',
    price: 245000,
    compare_at_price: 285000,
    cost_price: 141000,
    stock_quantity: 4,
    is_featured: 1,
    description: 'A softly curved channel-tufted headboard on an upholstered king base.',
    long_description:
      'The headboard curves forward at the edges, so it reads as a piece of furniture rather than a panel. Channel tufting in a heavy linen weave. Solid frame with a centre support rail and two floor legs — the part cheap beds omit and the reason they creak. King size, 183 × 200cm mattress. Slats included; mattress sold separately.',
  },
  {
    slug: 'tufted-wingback-bed',
    name: 'Regent Tufted Wingback Bed',
    category: 'beds-bedroom',
    sku: 'VMC-BED-302',
    price: 268000,
    compare_at_price: null,
    cost_price: 154000,
    stock_quantity: 3,
    is_featured: 1,
    description: 'Deep button-tufted headboard with wings and hand-set nailhead trim.',
    long_description:
      'Diamond button tufting done by hand, each button pulled through and tied rather than stapled. Wings on both sides give the bed presence against a large wall and cut draught from a running AC. Nailhead trim set individually along the frame. King size. Matching bench available separately.',
  },
  {
    slug: 'linen-platform-bed',
    name: 'Ivory Linen Platform Bed',
    category: 'beds-bedroom',
    sku: 'VMC-BED-303',
    price: 198000,
    compare_at_price: 225000,
    cost_price: 113000,
    stock_quantity: 6,
    is_featured: 0,
    description: 'A quiet, low upholstered bed in ivory linen with a shallow wing.',
    long_description:
      'Understated on purpose — a bed that lets the rest of the room speak. Ivory linen over a solid frame, low profile so a tall mattress still looks right. Fully upholstered base means no exposed metal or ply anywhere. King size. Fabric is removable and washable at 30°.',
  },
  {
    slug: 'low-walnut-platform-bed',
    name: 'Kyoto Low Platform Bed',
    category: 'beds-bedroom',
    sku: 'VMC-BED-304',
    price: 176000,
    compare_at_price: null,
    cost_price: 101000,
    stock_quantity: 5,
    is_featured: 0,
    description: 'Solid walnut, floating base, no headboard — for a low, calm room.',
    long_description:
      'A plinth rather than a frame, with a recessed base so the whole bed appears to float a few inches off the floor. Solid walnut with a hardwax oil finish that can be repaired at home rather than sent away. No headboard by design; pair it with a wall panel or leave it clean. King size, 28cm platform height.',
  },
  {
    slug: 'oak-bedside-table',
    name: 'Nord Oak Bedside Table',
    category: 'beds-bedroom',
    sku: 'VMC-BST-305',
    price: 26500,
    compare_at_price: 31000,
    cost_price: 14500,
    stock_quantity: 22,
    is_featured: 0,
    description: 'One soft-close drawer, one open shelf, tapered oak legs.',
    long_description:
      'A drawer for the things you want out of sight and an open shelf for the book you are actually reading. Soft-close runner rated to 20kg. Solid oak legs, oak-veneered carcass — the correct choice for a panel this size, since solid timber would move and bind the drawer. 50cm wide, 40cm deep, 55cm high. Cable notch at the back.',
  },
  {
    slug: 'sliding-door-wardrobe',
    name: 'Verona Sliding Wardrobe',
    category: 'storage',
    sku: 'VMC-WRD-401',
    price: 312000,
    compare_at_price: 365000,
    cost_price: 178000,
    stock_quantity: 2,
    is_featured: 1,
    description: 'Three-metre oak wardrobe with mirrored centre and integrated lighting.',
    long_description:
      'Sliding doors instead of hinged, because a three-metre run of swinging doors needs a metre of clear floor you probably do not have. Soft-close runners top and bottom. Mirrored centre panel. Integrated LED strip across the top rail, wired to a single plug. Interior is hanging rail plus adjustable shelving on both flanks. 300 × 235 × 65cm — we survey before install.',
  },
  {
    slug: 'oak-console-sideboard',
    name: 'Halden Console Sideboard',
    category: 'storage',
    sku: 'VMC-SDB-402',
    price: 118000,
    compare_at_price: null,
    cost_price: 67000,
    stock_quantity: 7,
    is_featured: 0,
    description: 'Two cabinets and two drawers under an oak top with a raised lip.',
    long_description:
      'The raised lip along the back stops things sliding off behind it, which is the small detail that makes a console usable in a hallway. Two cabinets with adjustable shelves and two central drawers. Push-to-open fronts, so no handles interrupt the line. Solid oak top, matt lacquer body. 160 × 45cm, 80cm high.',
  },
  {
    slug: 'gloss-media-console',
    name: 'Onyx Media Console',
    category: 'storage',
    sku: 'VMC-TVU-403',
    price: 94000,
    compare_at_price: 108000,
    cost_price: 53000,
    stock_quantity: 5,
    is_featured: 0,
    description: 'High-gloss four-door unit with ventilated backs and cable routing.',
    long_description:
      'Ventilated back panels behind every compartment, because a closed cabinet cooks a receiver. Cable routing cut through each divider. Four soft-close doors on a high-gloss lacquered front — nine coats, hand-polished. Takes a 75-inch screen on top. 180 × 45cm, 55cm high.',
  },
  {
    slug: 'grand-dining-table',
    name: 'Ravenna Eight-Seater Dining Table',
    category: 'dining',
    sku: 'VMC-DIN-501',
    price: 265000,
    compare_at_price: 310000,
    cost_price: 152000,
    stock_quantity: 3,
    is_featured: 1,
    description: 'A 240cm dark-oak table with a book-matched top and a trestle base.',
    long_description:
      'The top is book-matched — the boards are cut from the same log and mirrored, so the grain runs symmetrically across the width. Trestle base keeps legs away from knees, which is what makes eight seats actually work rather than six plus two people sitting on a leg. 240 × 110cm. Arrives in two pieces; two people and twenty minutes.',
  },
  {
    slug: 'walnut-round-dining-table',
    name: 'Solace Round Dining Table',
    category: 'dining',
    sku: 'VMC-DIN-502',
    price: 132000,
    compare_at_price: null,
    cost_price: 76000,
    stock_quantity: 6,
    is_featured: 1,
    description: 'Solid walnut, 120cm round, on splayed legs — seats four to five.',
    long_description:
      'Round is the right answer for a small dining room: no corners to walk into and everyone can see everyone. Solid walnut top, 30mm, hardwax oiled. Splayed legs are set inside the rim so chairs tuck fully under. 120cm diameter seats four comfortably, five at a push.',
  },
  {
    slug: 'moulded-dining-chair',
    name: 'Form Dining Chair',
    category: 'dining',
    sku: 'VMC-DCH-503',
    price: 14500,
    compare_at_price: 17500,
    cost_price: 7800,
    stock_quantity: 48,
    is_featured: 0,
    description: 'Moulded shell with a padded seat pad on solid beech legs.',
    long_description:
      'The shell is moulded with a real lumbar curve rather than pressed flat, which is why it stays comfortable through a long meal. Padded faux-leather seat pad, wipe-clean. Solid beech legs with steel cross-bracing underneath. 46cm seat height, correct for a 75cm table. Sold individually; most buyers take six.',
  },
  {
    slug: 'round-walnut-coffee-table',
    name: 'Drum Walnut Coffee Table',
    category: 'tables',
    sku: 'VMC-CTB-601',
    price: 58000,
    compare_at_price: 68000,
    cost_price: 33000,
    stock_quantity: 10,
    is_featured: 1,
    description: 'A turned solid-walnut drum with a fluted body and no sharp corners.',
    long_description:
      'Turned from solid walnut on a lathe, with the fluting cut afterwards by hand. Round and low with no corners at shin height, which is the reason to choose it if there are small children in the house. 90cm diameter, 40cm high — just under standard sofa seat height, which is where a coffee table belongs.',
  },
  {
    slug: 'cafe-pedestal-table',
    name: 'Bistro Pedestal Table',
    category: 'tables',
    sku: 'VMC-STB-602',
    price: 32000,
    compare_at_price: null,
    cost_price: 18000,
    stock_quantity: 14,
    is_featured: 0,
    description: 'A turned pedestal café table for two — balcony, nook or shop floor.',
    long_description:
      'Small enough for a balcony or a kitchen nook, heavy enough not to tip when someone leans on the edge — the cast base weighs 9kg on its own. Turned solid-wood column, lacquered top. 60cm diameter, 75cm high. Popular with cafés; we do trade pricing from six units.',
  },
]

export const navItems = [
  { label: 'Home', href: '/', display_order: 0 },
  { label: 'Shop', href: '/products', display_order: 1 },
  { label: 'Categories', href: '/categories', display_order: 2 },
  { label: 'About', href: '/about', display_order: 3 },
  { label: 'Contact', href: '/contact', display_order: 4 },
]

export const footerNavItems = [
  { label: 'Delivery', href: '/shipping', display_order: 0 },
  { label: 'Returns', href: '/policies/returns', display_order: 1 },
  { label: 'Privacy', href: '/policies/privacy', display_order: 2 },
  { label: 'Terms', href: '/policies/terms', display_order: 3 },
]

export const socialLinks = [
  { platform: 'Instagram', url: 'https://instagram.com/vemco.pk', icon: 'instagram', display_order: 0 },
  { platform: 'Facebook', url: 'https://facebook.com/vemco.pk', icon: 'facebook', display_order: 1 },
  { platform: 'YouTube', url: 'https://youtube.com/@vemco', icon: 'youtube', display_order: 2 },
]

export const isDatabaseEmpty = async (db?: Sql): Promise<boolean> => {
  const row = await runGet<{ count: number }>('SELECT COUNT(*) as count FROM products', [], db)
  return (row?.count ?? 0) === 0
}

export const hasDemoData = async (db?: Sql): Promise<boolean> => {
  const row = await runGet<{ count: number }>('SELECT COUNT(*) as count FROM demo_seed', [], db)
  return (row?.count ?? 0) > 0
}

const INSERT_CATEGORY = `
  INSERT INTO categories (name, slug, description, display_order, is_active)
  VALUES (?, ?, ?, ?, 1)
`
const INSERT_PRODUCT = `
  INSERT INTO products (
    name, slug, description, long_description, sku, category_id,
    price, compare_at_price, cost_price, stock_quantity,
    low_stock_threshold, is_featured, is_active
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 3, ?, 1)
`
const INSERT_IMAGE = `
  INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary)
  VALUES (?, ?, ?, ?, ?)
`
const INSERT_NAV = `
  INSERT INTO nav_items (label, href, display_order, is_active, location)
  VALUES (?, ?, ?, 1, ?)
`
const INSERT_SOCIAL = `
  INSERT INTO social_media_links (platform, url, icon, display_order, is_active)
  VALUES (?, ?, ?, ?, 1)
`
const TRACK = 'INSERT INTO demo_seed (table_name, row_id) VALUES (?, ?)'

/** Idempotent: does nothing if demo data is already present. */
export const seedDemoData = async (): Promise<{ seeded: boolean; products: number }> =>
  runTransaction(async tx => {
    /**
     * Checked inside the transaction, not before it.
     *
     * Two administrators pressing the button at the same moment used to be
     * impossible to arrange against one local file. Against a shared database
     * it is a Tuesday, and the loser of that race would insert a second copy
     * of the whole catalogue -- twenty products with duplicate SKUs.
     */
    if (await hasDemoData(tx)) return { seeded: false, products: 0 }

    const track = (table: string, id: number) => runInsert(TRACK, [table, id], tx)

    const categoryIds: Record<string, number> = {}
    for (const [index, category] of categories.entries()) {
      const id = await runInsert(
        INSERT_CATEGORY,
        [category.name, category.slug, category.description, index],
        tx
      )
      categoryIds[category.slug] = id
      await track('categories', id)
    }

    for (const product of products) {
      const productId = await runInsert(
        INSERT_PRODUCT,
        [
          product.name,
          product.slug,
          product.description,
          product.long_description,
          product.sku,
          categoryIds[product.category],
          product.price,
          product.compare_at_price,
          product.cost_price,
          product.stock_quantity,
          product.is_featured,
        ],
        tx
      )
      await track('products', productId)

      // Images cascade-delete with the product, so they need no ledger entry.
      await runInsert(INSERT_IMAGE, [productId, SMALL(product.slug), product.name, 0, 1], tx)
      await runInsert(
        INSERT_IMAGE,
        [productId, LARGE(product.slug), `${product.name} — detail`, 1, 0],
        tx
      )
    }

    for (const [location, items] of [
      ['header', navItems],
      ['footer', footerNavItems],
    ] as const) {
      for (const item of items) {
        const id = await runInsert(
          INSERT_NAV,
          [item.label, item.href, item.display_order, location],
          tx
        )
        await track('nav_items', id)
      }
    }

    for (const link of socialLinks) {
      const id = await runInsert(
        INSERT_SOCIAL,
        [link.platform, link.url, link.icon, link.display_order],
        tx
      )
      await track('social_media_links', id)
    }

    return { seeded: true, products: products.length }
  })

/**
 * Removes exactly the rows the seeder created, in foreign-key-safe order.
 * Anything an operator added is left alone -- it was never in the ledger.
 */
export const clearDemoData = async (): Promise<Record<string, number>> => {
  const removed: Record<string, number> = {}

  /**
   * Fixed list, never interpolated from a caller. It reads as though the
   * table name is being pasted into SQL because it is -- which is safe only
   * because these four strings are written here and nowhere else.
   */
  const order = ['products', 'categories', 'nav_items', 'social_media_links'] as const

  await runTransaction(async tx => {
    for (const table of order) {
      // One statement per table rather than one per row. The ledger read and
      // the delete used to be separate because SQLite was a function call
      // away; over a network, twenty round trips are twenty round trips.
      removed[table] = await runDelete(
        `DELETE FROM ${table} WHERE id IN (SELECT row_id FROM demo_seed WHERE table_name = ?)`,
        [table],
        tx
      )
    }

    await runDelete('DELETE FROM demo_seed', [], tx)
  })

  return removed
}

export const seedDatabase = () => seedDemoData()
