'use client'

import { InputHTMLAttributes, forwardRef, useId } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex h-5 items-center">
          <input
            type="checkbox"
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              // `peer` is what makes the tick below render. Without it the
              // peer-checked: variant never matches, so a checked box was a
              // featureless filled square -- which is why two admin screens
              // hand-rolled their own raw checkboxes instead.
              'peer h-4 w-4 cursor-pointer appearance-none rounded-xs border border-border-strong bg-surface',
              'checked:border-caramel-600 checked:bg-caramel-600',
              'transition-colors duration-fast ease-standard',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
              'disabled:cursor-not-allowed disabled:bg-surface-subtle',
              error && 'border-danger-600',
              className
            )}
            {...props}
          />
          <Check
            aria-hidden="true"
            strokeWidth={3}
            className="pointer-events-none absolute left-0 top-0.5 hidden h-4 w-4 text-white peer-checked:block"
          />
        </div>

        {label && (
          <div>
            <label
              htmlFor={inputId}
              className={cn(
                'cursor-pointer text-ui text-text-primary',
                props.disabled && 'cursor-not-allowed text-text-tertiary'
              )}
            >
              {label}
            </label>
            {error && (
              <p id={errorId} role="alert" className="mt-1 text-caption text-danger-700">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export default Checkbox
export { Checkbox }
