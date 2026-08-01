/**
 * Runs `next build` or `next start` in showcase mode.
 *
 * A tiny runner rather than `NEXT_PUBLIC_SHOWCASE=true next build`, because
 * that inline form is a parse error on Windows and this project is developed
 * there. Adding cross-env for two scripts is a dependency to maintain; this
 * is six lines that do the same thing.
 *
 * On Vercel none of this is used — the environment variable is set in the
 * project settings and the ordinary build command runs.
 */

import { spawn } from 'node:child_process'

const command = process.argv[2] ?? 'build'

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['next', command, ...process.argv.slice(3)],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, NEXT_PUBLIC_SHOWCASE: 'true' },
  }
)

child.on('exit', code => process.exit(code ?? 0))
