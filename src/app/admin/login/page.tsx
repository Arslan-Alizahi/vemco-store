'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import { adminUrl } from '@/lib/admin-path'

/**
 * The login screen.
 *
 * What it replaces compared a typed password against a literal in the client
 * bundle and set a localStorage flag on success -- both of them readable and
 * writable by anyone who opened the developer tools. The password now leaves
 * the browser, is checked against a scrypt hash on the server, and the result
 * is an httpOnly signed cookie that JavaScript cannot read at all.
 */
function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || adminUrl()

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await response.json()

      if (!data.success) {
        setError(data.message || 'That password does not match')
        setPassword('')
        return
      }

      // A full navigation, not router.push: the cookie has just been set and
      // middleware needs to see it on the next request.
      window.location.href = next
    } catch {
      setError('We could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="w-full max-w-md shadow-e3">
      <div className="mb-6 flex justify-center">
        <div className="rounded-full bg-caramel-100 p-4">
          <Lock className="h-7 w-7 text-caramel-700" aria-hidden="true" />
        </div>
      </div>

      <h1 className="text-center font-serif text-h1 text-text-primary">Admin access</h1>
      <p className="mt-2 text-center text-body text-text-secondary">
        Sign in to manage the shop.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          error={error}
          autoFocus
        />

        <Button type="submit" fullWidth size="lg" isLoading={busy} disabled={!password}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-caption text-text-tertiary">
        Sessions last eight hours.
      </p>
    </Card>
  )
}

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-5">
      <Suspense fallback={<Spinner size="lg" />}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
