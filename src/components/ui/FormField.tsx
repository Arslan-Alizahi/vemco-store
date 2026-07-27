'use client'

import { useId } from 'react'
import { cn } from '@/lib/cn'

/**
 * One shared control size union across Button, Input and Select.
 *
 * These previously could not align: Button md was ~34px, Select md ~34px with
 * different horizontal padding, and Input ~42px because it set no text size
 * and inherited 16px. The checkout form and the POS both put all three in one
 * row.
 *
 * `lg` is 44px, which is also the minimum touch target.
 */
export const controlSize = {
  sm: 'h-8 px-3 text-ui',
  md: 'h-9 px-3.5 text-ui',
  lg: 'h-11 px-4 text-body',
} as const

export type ControlSize = keyof typeof controlSize

/** Shared surface treatment for text inputs and selects. */
export const controlBase = cn(
  'block w-full rounded-sm border bg-surface text-text-primary',
  'border-border-strong placeholder:text-text-tertiary',
  'transition-colors duration-fast ease-standard',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring',
  'disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-tertiary'
)

export interface FieldProps {
  label?: string
  error?: string
  helperText?: string
}

interface FormFieldProps extends FieldProps {
  required?: boolean
  /** Receives the wiring every labelled control needs. */
  children: (ids: {
    id: string
    'aria-invalid': boolean | undefined
    'aria-describedby': string | undefined
  }) => React.ReactNode
  className?: string
}

/**
 * Owns the label/error/helper contract so no control has to reinvent it.
 *
 * Input and Select previously rendered a <label> with no htmlFor and generated
 * no id, so every field on checkout, admin and the POS was unlabelled --
 * clicking the label did nothing and screen readers announced nothing.
 */
export function FormField({
  label,
  error,
  helperText,
  required,
  children,
  className,
}: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const helperId = `${id}-helper`
  const describedBy = error ? errorId : helperText ? helperId : undefined

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-ui font-medium text-text-secondary">
          {label}
          {required && (
            <span className="ml-1 text-danger-600" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}

      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-caption text-danger-700">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-caption text-text-tertiary">
          {helperText}
        </p>
      )}
    </div>
  )
}
