'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { validateEmail } from '@/lib/utils'

interface Fields {
  name: string
  email: string
  phone: string
  message: string
}

const EMPTY: Fields = { name: '', email: '', phone: '', message: '' }

/**
 * Contact form.
 *
 * NOTE: this does not send anything yet. There is no mail transport in the
 * project, so submitting shows a message and clears the form — the same
 * behaviour as before, but the copy no longer claims we will reply, because
 * nobody would receive it. Wiring this to a real inbox is a backend task.
 */
export function ContactForm() {
  const [values, setValues] = useState<Fields>(EMPTY)
  const [errors, setErrors] = useState<Partial<Fields>>({})
  const [submitting, setSubmitting] = useState(false)
  const { addToast } = useToast()

  const set = (field: keyof Fields) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues(current => ({ ...current, [field]: event.target.value }))
    setErrors(current => ({ ...current, [field]: undefined }))
  }

  const validate = () => {
    const next: Partial<Fields> = {}
    if (!values.name.trim()) next.name = 'Tell us who you are'
    if (!values.email.trim()) next.email = 'We need an email to reply to'
    else if (!validateEmail(values.email)) next.email = 'That does not look like an email address'
    if (!values.message.trim()) next.message = 'Tell us what you need'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    // Placeholder for a real transport.
    window.setTimeout(() => {
      setValues(EMPTY)
      setSubmitting(false)
      addToast('Thanks — we have your message. We reply within one working day.', 'success')
    }, 600)
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Name"
          name="name"
          autoComplete="name"
          value={values.name}
          onChange={set('name')}
          error={errors.name}
          required
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={set('email')}
          error={errors.email}
          required
        />
      </div>

      <Input
        label="Phone"
        name="phone"
        type="tel"
        autoComplete="tel"
        helperText="Optional, but faster for anything about a live order."
        value={values.phone}
        onChange={set('phone')}
      />

      <Textarea
        label="Message"
        name="message"
        rows={6}
        placeholder="Which room, roughly what size, and what you have in mind."
        value={values.message}
        onChange={set('message')}
        error={errors.message}
        required
      />

      <Button
        type="submit"
        size="lg"
        fullWidth
        isLoading={submitting}
        rightIcon={<Send className="h-4 w-4" />}
      >
        Send message
      </Button>
    </form>
  )
}

export default ContactForm
