/**
 * Rewrites SQLite's `?` placeholders as Postgres's `$1, $2, …`.
 *
 * There are 315 database calls across 42 files in this application, and the
 * SQL in them is ordinary SQL -- it was only ever the placeholder syntax that
 * tied it to SQLite. Converting here means those queries move to Postgres
 * unchanged, which is 315 chances not taken to mistype a column name while
 * hand-editing them.
 *
 * A `?` inside a string literal, a quoted identifier or a comment is data,
 * not a placeholder, so this scans the statement rather than running a
 * regular expression over it. `WHERE notes = '?'` has to survive untouched.
 */
export const toPositional = (sql: string): string => {
  let out = ''
  let index = 0

  // What we are currently inside of. Only one can apply at a time, which is
  // why this is one variable rather than four booleans.
  let mode: 'sql' | 'string' | 'identifier' | 'line-comment' | 'block-comment' = 'sql'

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]
    const next = sql[i + 1]

    if (mode === 'string') {
      // '' is an escaped quote within a string, not the end of one.
      if (char === "'" && next === "'") {
        out += "''"
        i++
        continue
      }
      if (char === "'") mode = 'sql'
      out += char
      continue
    }

    if (mode === 'identifier') {
      if (char === '"') mode = 'sql'
      out += char
      continue
    }

    if (mode === 'line-comment') {
      if (char === '\n') mode = 'sql'
      out += char
      continue
    }

    if (mode === 'block-comment') {
      if (char === '*' && next === '/') {
        out += '*/'
        i++
        mode = 'sql'
        continue
      }
      out += char
      continue
    }

    if (char === "'") {
      mode = 'string'
      out += char
      continue
    }

    if (char === '"') {
      mode = 'identifier'
      out += char
      continue
    }

    if (char === '-' && next === '-') {
      mode = 'line-comment'
      out += '--'
      i++
      continue
    }

    if (char === '/' && next === '*') {
      mode = 'block-comment'
      out += '/*'
      i++
      continue
    }

    if (char === '?') {
      index++
      out += `$${index}`
      continue
    }

    out += char
  }

  return out
}
