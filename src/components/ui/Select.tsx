'use client'

import { SelectHTMLAttributes, forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { FormField, controlBase, controlSize, type ControlSize, type FieldProps } from './FormField'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    FieldProps {
  options: SelectOption[]
  placeholder?: string
  size?: ControlSize
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, error, helperText, options, placeholder, size = 'md', ...props },
    ref
  ) => {
    return (
      <FormField label={label} error={error} helperText={helperText} required={props.required}>
        {ids => (
          <div className="relative">
            <select
              ref={ref}
              className={cn(
                controlBase,
                controlSize[size],
                'cursor-pointer appearance-none pr-10',
                error && 'border-danger-600 focus-visible:ring-danger-600',
                className
              )}
              {...ids}
              {...props}
            >
              {placeholder && (
                <option value="" disabled>
                  {placeholder}
                </option>
              )}
              {options.map(option => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronDown className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
            </div>
          </div>
        )}
      </FormField>
    )
  }
)

Select.displayName = 'Select'

export default Select
export { Select }
