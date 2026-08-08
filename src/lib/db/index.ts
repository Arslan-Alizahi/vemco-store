import postgres from 'postgres'
import { toPositional } from './placeholders'

/**
 * The connection to Postgres, and the helpers everything else uses.
 *
 * This replaced better-sqlite3. SQLite needs a writable disk that is the same
 * disk on the next request, and no serverless host has one: the filesystem is
 * read-only and every instance gets its own. That is the whole reason the
 * first deployment could only be a catalogue with the till and the admin
 * switched off.
 *
 * The helpers keep the names and shapes they had, so the SQL in the 42 files
 * that call them did not need rewriting -- only awaiting. The one unavoidable
 * change is that they are async, because a network round trip cannot be
 * pretended away the way a local file read could.
 */

export type Sql = ReturnType<typeof postgres>

/**
 * A storefront-only build has no database and must not try to reach one.
 *
 * Kept from the SQLite version and still true: in showcase mode the catalogue
 * comes from src/lib/catalogue.ts and every write is refused by middleware,
 * so anything arriving here is a bug worth a clear message rather than a
 * connection timeout thirty seconds later.
 */
const refuseInShowcase = () => {
  if (process.env.NEXT_PUBLIC_SHOWCASE !== 'true') return
  throw new Error(
    'No database in a showcase build. Read the catalogue from src/lib/catalogue.ts, ' +
      'or deploy with DATABASE_URL set to run the full application.'
  )
}

/**
 * Cached on globalThis rather than in a module variable.
 *
 * Next reloads modules on every edit in development, and a fresh pool per
 * reload exhausts the project's connection limit within a few minutes of
 * working on a route. The global outlives the module.
 */
const globalForDb = globalThis as unknown as { vemcoDb?: Sql }

export const getDb = (): Sql => {
  refuseInShowcase()

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy the Transaction pooler connection string from ' +
        'Supabase (Project Settings -> Database -> Connection string) into .env.local, ' +
        'and set it in the host environment for deployments.'
    )
  }

  if (!globalForDb.vemcoDb) {
    globalForDb.vemcoDb = postgres(connectionString, {
      /**
       * Supabase's pooler in transaction mode does not support prepared
       * statements: one prepared on this connection is not there on the next.
       * Left on, it produces "prepared statement s1 does not exist" under
       * load and nowhere else -- the worst kind of bug to meet in production.
       */
      prepare: false,

      /**
       * Do not introspect the server's types on connect.
       *
       * postgres.js opens every new connection by querying pg_type to learn
       * about array types -- a round trip before the connection can be used,
       * repeated for each one in the pool. This application uses only
       * built-in types, so there is nothing to learn.
       */
      fetch_types: false,

      /**
       * A small pool, not a single connection.
       *
       * One was the obvious choice for serverless -- it scales by running
       * more instances, so a large pool per instance is more connections for
       * no extra throughput. It also failed: with max:1 the first request a
       * process served worked and every request after it hung, because a
       * single page render wants its navigation, its footer and its own data
       * at once and those queue behind each other. Three covers that fan-out
       * and is still modest against the free tier's limit.
       */
      max: Number(process.env.DATABASE_POOL_MAX) || 3,

      /**
       * No idle_timeout. The pooler already reclaims connections that go
       * quiet, and having the client close them too only adds a window where
       * a queued query is waiting on a connection that is being replaced.
       */
      connect_timeout: 15,
      ssl: 'require',

      // DB_DEBUG=1 prints every statement as it is sent. Useful when a page
      // hangs rather than errors, which is what a query that never returns
      // looks like from the outside.
      ...(process.env.DB_DEBUG
        ? {
            debug: (_connection: number, query: string) =>
              console.log('[db]', query.replace(/\s+/g, ' ').slice(0, 110)),
          }
        : {}),

      connection: {
        /**
         * No statement may run for more than fifteen seconds.
         *
         * Postgres aborts it and the driver raises, which is the difference
         * between a page that fails and a page that hangs. On a serverless
         * host a query with no ceiling holds the whole invocation open until
         * the platform kills it, and the only evidence left is a timeout with
         * no cause attached.
         */
        statement_timeout: Number(process.env.DATABASE_STATEMENT_TIMEOUT) || 15_000,

        /**
         * Which schema unqualified table names resolve to.
         *
         * Unset in normal use, so everything lands in `public`. The tests set
         * it to a scratch schema they create and drop, which is how they get
         * a real database to run against -- the same Postgres, the same DDL,
         * the same driver -- without truncating the shop's actual orders
         * table to assert that a refused order creates no rows.
         */
        ...(process.env.DATABASE_SCHEMA
          ? { search_path: process.env.DATABASE_SCHEMA }
          : {}),
      },

      types: {
        /**
         * Postgres returns NUMERIC as a string, since that is the only
         * lossless representation of an arbitrary-precision number in
         * JavaScript. Correct in general, wrong here: every price in this
         * application is already a JS number and every total is arithmetic on
         * one. Left alone, "58000" + "68000" is "5800068000" and the cart
         * shows a ten-digit total.
         *
         * Parsing only. Values on the way in are unaffected unless a caller
         * asks for this type explicitly, so nothing starts silently rounding.
         */
        numeric: {
          to: 1700,
          from: [1700],
          serialize: (value: number) => String(value),
          parse: (value: string) => Number(value),
        },

        /**
         * Same for BIGINT, which is what COUNT(*) comes back as. The
         * pagination code does arithmetic on those counts.
         */
        int8: {
          to: 20,
          from: [20],
          serialize: (value: number) => String(value),
          parse: (value: string) => Number(value),
        },

        /**
         * Timestamps as ISO strings rather than Date objects.
         *
         * Every row type in this codebase declares created_at as `string`,
         * and the print components hand it straight to formatDate. Returning
         * a Date would type-check nowhere and format differently in one
         * place.
         *
         * It also fixes something that was quietly wrong under SQLite, which
         * stored "2026-08-08 13:31:34" with no zone marker. `new Date` reads
         * that as *local* time, so every receipt and every order timestamp
         * was displayed five hours off in Pakistan. An ISO string carries its
         * offset and lands on the right minute.
         */
        timestamptz: {
          to: 1184,
          from: [1184, 1114],
          serialize: (value: string | Date) =>
            value instanceof Date ? value.toISOString() : value,

          /**
           * Postgres sends "2026-08-08 17:49:52.123456+00", which is not
           * quite ISO: a space instead of the T, and a two-digit offset where
           * JavaScript wants four. Both have to be repaired before `new Date`
           * will look at it -- unrepaired it returns Invalid Date, and
           * `.toISOString()` on that throws inside the driver's row parser,
           * which surfaces as every insert failing with a RangeError far from
           * anything that looks like a date.
           *
           * A value with no offset at all is a `timestamp` rather than a
           * `timestamptz`; there are none in this schema, but reading it as
           * UTC is the right guess if one ever appears.
           */
          parse: (value: string) => {
            const withT = value.replace(' ', 'T')
            const zoned = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/.test(withT)
              ? withT.replace(/([+-]\d{2})$/, '$1:00')
              : `${withT}Z`

            const date = new Date(zoned)
            return Number.isNaN(date.getTime()) ? value : date.toISOString()
          },
        },
      },
    })
  }

  return globalForDb.vemcoDb
}

/**
 * `unsafe` is the right call here despite the name.
 *
 * It means "this string did not come from the tagged template", not "this
 * string is not escaped". Parameters still travel out of band as $1, $2 and
 * are never interpolated, so a value containing a quote stays a value
 * containing a quote. The queries here are literals in the source; the values
 * are what came from users.
 */

/**
 * Every statement leaves here carrying at least one bound parameter.
 *
 * postgres.js chooses the wire protocol by counting arguments: none means the
 * *simple* protocol, any means the *extended* one. Simple queries cannot be
 * pipelined, and on a connection that has already served an extended query
 * they deadlock as soon as two of them are in flight together -- no error, no
 * statement timeout, the query is never sent and the caller waits for ever.
 *
 * That is what took `/categories` and the revenue dashboard down. Both issue
 * several aggregate queries at once, and aggregates rarely need a parameter,
 * so both were sending nothing but simple queries. Pages that happened to
 * bind a value -- almost every other page -- were unaffected, which is why it
 * looked like a problem with two particular screens rather than with all of
 * them.
 *
 * The CTE is never referenced and costs nothing; its only job is to put a
 * `$1` in the statement so a value has to be bound. It goes first because a
 * WITH clause must, and the original statement follows on its own line so a
 * leading `--` comment cannot swallow it.
 *
 * `{ simple: false }` and `{ prepare: true }` were both tried first. Neither
 * changes the choice.
 */
const bindable = (sql: string, params: unknown[]): [string, unknown[]] =>
  params.length > 0
    ? [sql, params]
    : [`WITH _extended AS (SELECT ?::boolean)\n${sql}`, [true]]

const execute = async <T>(sql: string, params: unknown[], db?: Sql): Promise<T[]> => {
  const client = db ?? getDb()
  const [statement, values] = bindable(sql, params)
  const rows = await client.unsafe(toPositional(statement), values as never[])

  /**
   * Copied into plain arrays and plain objects on the way out.
   *
   * postgres.js returns its own array subclass, carrying `count`, `command`
   * and `statement` alongside the rows, and builds each row on a cached
   * prototype rather than as an object literal. Those are the driver's
   * internals, and every caller here treats the result as data -- spreading
   * it, passing it into JSX, serialising it to JSON. Handing them a plain
   * copy means nothing downstream has to know what produced it.
   */
  return rows.map(row => ({ ...row })) as T[]
}

export const runQuery = async <T>(sql: string, params: unknown[] = [], db?: Sql): Promise<T[]> =>
  execute<T>(sql, params, db)

export const runGet = async <T>(
  sql: string,
  params: unknown[] = [],
  db?: Sql
): Promise<T | undefined> => (await execute<T>(sql, params, db))[0]

/**
 * Returns the new row's id.
 *
 * SQLite handed back `lastInsertRowid` from the driver. Postgres has no
 * equivalent -- the id comes from the statement itself -- so RETURNING id is
 * appended unless the caller wrote one already.
 */
export const runInsert = async (sql: string, params: unknown[] = [], db?: Sql): Promise<number> => {
  const statement = /\breturning\b/i.test(sql)
    ? sql
    : `${sql.trimEnd().replace(/;$/, '')} RETURNING id`
  const row = await runGet<{ id: number }>(statement, params, db)
  return row?.id ?? 0
}

/** Rows affected, matching what better-sqlite3 reported as `changes`. */
const affected = async (sql: string, params: unknown[], db?: Sql): Promise<number> => {
  const client = db ?? getDb()
  const [statement, values] = bindable(sql, params)
  const result = await client.unsafe(toPositional(statement), values as never[])
  return result.count ?? 0
}

export const runUpdate = async (sql: string, params: unknown[] = [], db?: Sql): Promise<number> =>
  affected(sql, params, db)

export const runDelete = async (sql: string, params: unknown[] = [], db?: Sql): Promise<number> =>
  affected(sql, params, db)

/**
 * Everything inside commits together or not at all.
 *
 * The callback is handed a connection-scoped client that must be passed to
 * every helper inside it. A query that forgets it runs on a different
 * connection, outside the transaction, and will not roll back with the rest
 * -- which is why the parameter is required rather than ambient.
 */
export const runTransaction = async <T>(fn: (tx: Sql) => Promise<T>): Promise<T> => {
  const db = getDb()
  return db.begin(tx => fn(tx as unknown as Sql)) as Promise<T>
}

/** Only for tests and scripts. Serverless instances are torn down for us. */
export const closeDb = async () => {
  if (globalForDb.vemcoDb) {
    await globalForDb.vemcoDb.end()
    globalForDb.vemcoDb = undefined
  }
}
