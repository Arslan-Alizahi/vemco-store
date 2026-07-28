'use client'

import { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'
import Button from './Button'
import Input from './Input'
import Card from './Card'
import Spinner from './Spinner'

interface AdminAuthProps {
  children: React.ReactNode
}

/**
 * This is not authentication, and it is written to be obvious about that.
 *
 * The password is a literal in a client bundle and the session flag lives in
 * localStorage, so anyone can read the first and set the second. It keeps a
 * demo tidy and stops nobody. The screen says so in as many words, because a
 * gate that looks convincing is worse than one that does not -- the danger is
 * someone shipping this believing the admin area is protected.
 *
 * Replacing it means a server session and a route guard, which is a backend
 * task rather than a styling one.
 */
const ADMIN_PASSWORD = 'admin123'
const AUTH_KEY = 'admin_authenticated'
const AUTH_EXPIRY = 'admin_auth_expiry'
const SESSION_DURATION = 60 * 60 * 1000

export function AdminAuth({ children }: AdminAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const authenticated = localStorage.getItem(AUTH_KEY)
    const expiry = localStorage.getItem(AUTH_EXPIRY)

    if (authenticated === 'true' && expiry && Date.now() < parseInt(expiry, 10)) {
      setIsAuthenticated(true)
    } else {
      localStorage.removeItem(AUTH_KEY)
      localStorage.removeItem(AUTH_EXPIRY)
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (password !== ADMIN_PASSWORD) {
      setError('That password does not match')
      setPassword('')
      return
    }

    localStorage.setItem(AUTH_KEY, 'true')
    localStorage.setItem(AUTH_EXPIRY, String(Date.now() + SESSION_DURATION))
    setIsAuthenticated(true)
    setPassword('')
  }

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(AUTH_EXPIRY)
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-5">
        <Card className="w-full max-w-md shadow-e3">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-caramel-100 p-4">
              <Lock className="h-7 w-7 text-caramel-700" aria-hidden="true" />
            </div>
          </div>

          <h1 className="text-center font-serif text-h1 text-text-primary">Admin access</h1>
          <p className="mt-2 text-center text-body text-text-secondary">
            Enter the password to reach the dashboard.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {/* A real label, not a placeholder standing in for one. A
                placeholder disappears the moment you type and is not reliably
                announced, so the field had no accessible name at all. */}
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              error={error}
              autoFocus
            />

            <Button type="submit" fullWidth size="lg" disabled={!password}>
              Sign in
            </Button>
          </form>

          {/* Warning, not information. The old panel styled this in calm blue
              as though printing the password were a helpful nicety. It is a
              hole, and it should read like one. */}
          <div className="mt-6 rounded-md border border-warning-100 bg-warning-50 p-4">
            <p className="text-ui font-medium text-warning-900">Demo gate, not security</p>
            <p className="mt-1 text-ui text-warning-900">
              The password is{' '}
              <code className="rounded-xs bg-warning-100 px-1.5 py-0.5 font-mono">admin123</code>,
              and it is readable in the page source by anyone who looks. Put real
              server-side authentication in front of this before it goes anywhere near
              live orders.
            </p>
          </div>

          <p className="mt-4 text-center text-caption text-text-tertiary">
            The session ends after an hour.
          </p>
        </Card>
      </main>
    )
  }

  return (
    <>
      {children}
      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        className="fixed bottom-4 right-4 z-sticky bg-surface shadow-e2"
      >
        Sign out
      </Button>
    </>
  )
}
