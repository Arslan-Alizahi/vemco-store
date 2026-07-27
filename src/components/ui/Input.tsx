'use client'

import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'
import { FormField, controlBase, controlSize, type ControlSize, type FieldProps } from './FormField'

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    FieldProps {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  size?: ControlSize
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, size = 'md', ...props }, ref) => {
    return (
      <FormField label={label} error={error} helperText={helperText} required={props.required}>
        {ids => (
          <div className="relative">
            {leftIcon && (
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-tertiary">
                {leftIcon}
              </div>
            )}
            <input
              ref={ref}
              className={cn(
                controlBase,
                controlSize[size],
                leftIcon && 'pl-10',
                rightIcon && 'pr-10',
                error && 'border-danger-600 focus-visible:ring-danger-600',
                className
              )}
              {...ids}
              {...props}
            />
            {rightIcon && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-tertiary">
                {rightIcon}
              </div>
            )}
          </div>
        )}
      </FormField>
    )
  }
)

Input.displayName = 'Input'

export default Input
export { Input }
