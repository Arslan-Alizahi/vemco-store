-- The schema, as one file.
--
-- This is what was applied to Supabase (as the create_core_tables and
-- create_triggers migrations) and what the tests build their scratch schema
-- from, so there is one description of the tables rather than two that drift.
--
-- Two deliberate non-conversions from the SQLite original:
--
-- 1. The is_active / is_featured / is_primary flags stay INTEGER rather than
--    becoming BOOLEAN. Every query compares them to 1, and changing the type
--    would mean touching all of them for no behavioural gain.
--
-- 2. Money stays NUMERIC(10,2). The driver parses it back to a JS number so
--    arithmetic works as it did, but the column still refuses a price with
--    three decimal places.

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  long_description TEXT,
  sku TEXT UNIQUE NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  price NUMERIC(10, 2) NOT NULL,
  compare_at_price NUMERIC(10, 2),
  cost_price NUMERIC(10, 2),
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  is_featured INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address TEXT,
  billing_address TEXT,
  subtotal NUMERIC(10, 2) NOT NULL,
  tax NUMERIC(10, 2) DEFAULT 0,
  shipping_cost NUMERIC(10, 2) DEFAULT 0,
  discount NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  notes TEXT,
  stripe_session_id TEXT,
  stripe_session_expires_at BIGINT,
  stripe_payment_link_url TEXT,
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  product_image TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Counter customers.
--
-- The phone number is the identity, not the name. It is what a cashier asks
-- for, what a returning customer can repeat from memory, and what does not
-- change between "Bilal Ahmed" and "Bilal A." on two different visits.
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_receipts (
  id SERIAL PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  -- Nullable: a walk-in who does not want to leave a number still gets a
  -- receipt. The name and phone are also copied onto the row, so a receipt
  -- reprinted years later says who it was for even if the customer record has
  -- since been edited or removed.
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal NUMERIC(10, 2) NOT NULL,
  tax NUMERIC(10, 2) DEFAULT 0,
  discount NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  amount_paid NUMERIC(10, 2) NOT NULL,
  change_amount NUMERIC(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_items (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER NOT NULL REFERENCES billing_receipts(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nav_items (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  parent_id INTEGER REFERENCES nav_items(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'link',
  target TEXT DEFAULT '_self',
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  location TEXT DEFAULT 'header',
  meta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_media_links (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Every sale, from the website and the counter alike, in one place.
CREATE TABLE IF NOT EXISTS revenue_transactions (
  id SERIAL PRIMARY KEY,
  transaction_type TEXT NOT NULL,
  reference_id INTEGER NOT NULL,
  reference_number TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  subtotal NUMERIC(10, 2) NOT NULL,
  tax NUMERIC(10, 2) DEFAULT 0,
  discount NUMERIC(10, 2) DEFAULT 0,
  shipping_cost NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'completed',
  notes TEXT,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The ledger of what the seeder created, so clearing demo data removes
-- exactly those rows and never touches anything an operator added.
CREATE TABLE IF NOT EXISTS demo_seed (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON billing_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_billing_customer ON billing_receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_nav_items_parent ON nav_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_nav_items_location ON nav_items(location);
CREATE INDEX IF NOT EXISTS idx_social_media_display_order ON social_media_links(display_order);
CREATE INDEX IF NOT EXISTS idx_revenue_transaction_type ON revenue_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_revenue_transaction_date ON revenue_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_revenue_reference ON revenue_transactions(transaction_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_demo_seed_table ON demo_seed(table_name);

-- SQLite wrote these as AFTER UPDATE triggers that issued a second UPDATE
-- against the same row. Postgres has a better shape for it: a BEFORE trigger
-- amends the row on its way in, so there is one write instead of two and no
-- risk of recursion.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_categories_timestamp ON categories;
CREATE TRIGGER update_categories_timestamp BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS update_products_timestamp ON products;
CREATE TRIGGER update_products_timestamp BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS update_orders_timestamp ON orders;
CREATE TRIGGER update_orders_timestamp BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS update_customers_timestamp ON customers;
CREATE TRIGGER update_customers_timestamp BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS update_nav_items_timestamp ON nav_items;
CREATE TRIGGER update_nav_items_timestamp BEFORE UPDATE ON nav_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS update_social_media_timestamp ON social_media_links;
CREATE TRIGGER update_social_media_timestamp BEFORE UPDATE ON social_media_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Revenue is recorded by the database, not by the routes.
--
-- A counter sale and a website sale are written by different code paths, and
-- leaving each one to remember to file its own revenue row is how a month's
-- takings ends up short by whichever path was edited last.
CREATE OR REPLACE FUNCTION record_billing_revenue() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO revenue_transactions (
    transaction_type, reference_id, reference_number,
    customer_name, customer_phone,
    subtotal, tax, discount, total,
    payment_method, payment_status, notes, transaction_date
  ) VALUES (
    'billing', NEW.id, NEW.receipt_number,
    NEW.customer_name, NEW.customer_phone,
    NEW.subtotal, NEW.tax, NEW.discount, NEW.total,
    NEW.payment_method, 'completed', NEW.notes, NEW.created_at
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_revenue_from_billing ON billing_receipts;
CREATE TRIGGER create_revenue_from_billing AFTER INSERT ON billing_receipts
  FOR EACH ROW EXECUTE FUNCTION record_billing_revenue();

CREATE OR REPLACE FUNCTION record_order_revenue() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO revenue_transactions (
    transaction_type, reference_id, reference_number,
    customer_name, customer_email, customer_phone,
    subtotal, tax, discount, shipping_cost, total,
    payment_method, payment_status, notes, transaction_date
  ) VALUES (
    'store', NEW.id, NEW.order_number,
    NEW.customer_name, NEW.customer_email, NEW.customer_phone,
    NEW.subtotal, NEW.tax, NEW.discount, NEW.shipping_cost, NEW.total,
    NEW.payment_method, NEW.payment_status, NEW.notes, NEW.updated_at
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- An order that arrives already paid files its revenue immediately.
DROP TRIGGER IF EXISTS create_revenue_from_order ON orders;
CREATE TRIGGER create_revenue_from_order AFTER INSERT ON orders
  FOR EACH ROW WHEN (NEW.payment_status IN ('completed', 'paid'))
  EXECUTE FUNCTION record_order_revenue();

-- And one that is paid later files it at the moment it turns paid, once --
-- the WHEN clause only fires on the crossing, not on every later update.
DROP TRIGGER IF EXISTS update_revenue_on_order_payment ON orders;
CREATE TRIGGER update_revenue_on_order_payment AFTER UPDATE ON orders
  FOR EACH ROW WHEN (
    OLD.payment_status NOT IN ('completed', 'paid')
    AND NEW.payment_status IN ('completed', 'paid')
  )
  EXECUTE FUNCTION record_order_revenue();
