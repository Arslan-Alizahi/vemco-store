/**
 * A no-op stand-in for `server-only` under Vitest.
 *
 * The real package deliberately throws when it is resolved through a
 * browser-ish condition, which is the whole point of it: importing the mail
 * transport -- and with it the SMTP password -- into a client component
 * should fail the build rather than ship a credential to the browser.
 *
 * The tests run in jsdom, so they resolve it exactly the way a client
 * component would and would blow up on an import that is entirely legitimate
 * in a route handler. Aliasing it here keeps the guarantee where it matters
 * (`next build`) without making it impossible to test the code it guards.
 */
export {}
