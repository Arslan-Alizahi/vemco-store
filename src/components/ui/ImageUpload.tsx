'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/cn'
import IconButton from './IconButton'
import Spinner from './Spinner'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  onRemove?: () => void
  disabled?: boolean
  className?: string
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled = false,
  className = '',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('That file is not an image')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Images have to be under 5MB')
      return
    }

    setError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Upload failed')

      onChange(data.url)
    } catch (uploadError) {
      console.error('Upload error:', uploadError)
      setError(uploadError instanceof Error ? uploadError.message : 'The upload did not go through')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (!value || !onRemove) return

    try {
      const filename = value.split('/').pop()
      if (filename) {
        await fetch(`/api/upload?filename=${filename}`, { method: 'DELETE' })
      }
      onRemove()
    } catch (removeError) {
      console.error('Error removing image:', removeError)
      setError('The image could not be removed')
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {value ? (
        <div className="group relative">
          <div className="relative h-64 w-full overflow-hidden rounded-md border border-border-subtle bg-surface-subtle">
            <Image src={value} alt="" fill sizes="(min-width: 768px) 50vw, 90vw" className="object-contain" />
          </div>
          {!disabled && onRemove && (
            /* Visible on hover, and on focus. It used to be opacity-0 until
               the group was hovered, which meant a keyboard user tabbed onto
               a button they could not see -- the focus ring was drawn on an
               invisible element. */
            <IconButton
              label="Remove image"
              variant="solid"
              size="sm"
              onClick={handleRemove}
              className="absolute right-2 top-2 bg-surface/90 text-text-secondary opacity-0 shadow-e1 transition-opacity duration-fast hover:bg-surface hover:text-danger-600 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <X />
            </IconButton>
          )}
        </div>
      ) : (
        /* A button, not a div with an onClick. The dropzone was previously
           unreachable by keyboard entirely: no role, no tabIndex, no key
           handler. Adding images was mouse-only. */
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className={cn(
            'relative flex h-64 w-full flex-col items-center justify-center gap-2',
            'rounded-md border-2 border-dashed border-border-strong bg-surface',
            'transition-colors duration-fast ease-standard',
            'hover:border-caramel-600 hover:bg-caramel-50',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border-strong disabled:hover:bg-surface'
          )}
        >
          {uploading ? (
            <Spinner size="lg" label="Uploading" showLabel />
          ) : (
            <>
              <span className="mb-2 rounded-full bg-surface-subtle p-4">
                <ImageIcon className="h-7 w-7 text-text-tertiary" aria-hidden="true" />
              </span>
              <span className="flex items-center gap-2 text-body font-medium text-text-secondary">
                <Upload className="h-4 w-4" aria-hidden="true" />
                Choose an image
              </span>
              <span className="text-ui text-text-tertiary">PNG, JPG, GIF or WEBP, up to 5MB</span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
        tabIndex={-1}
      />

      {error && (
        <p role="alert" className="text-ui text-danger-700">
          {error}
        </p>
      )}
    </div>
  )
}
