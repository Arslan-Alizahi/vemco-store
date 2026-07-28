'use client'

import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'
import { FormField, controlBase, type FieldProps } from './FormField'

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    FieldProps {}

/**
 * Multi-line input.
 *
 * Shares `controlBase` with Input and Select, so the contact form no longer
 * has a hand-styled textarea sitting under inputs it does not match. Padding
 * is vertical here rather than a fixed height, since the control grows.
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, rows = 5, ...props }, ref) => (
    <FormField label={label} error={error} helperText={helperText} required={props.required}>
      {ids => (
        <textarea
          ref={ref}
          rows={rows}
          className={cn(
            controlBase,
            'resize-y px-3.5 py-2.5 text-ui',
            error && 'border-danger-600 focus-visible:ring-danger-600',
            className
          )}
          {...ids}
          {...props}
        />
      )}
    </FormField>
  )
)

Textarea.displayName = 'Textarea'

export default Textarea
export { Textarea }
