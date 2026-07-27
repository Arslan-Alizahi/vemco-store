'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-medium',
    // Colour only. Hover never changes geometry -- the previous base string
    // carried btn-hover-lift, so ghost, link and disabled buttons all rose 2px
    // with a 20px shadow.
    'transition-colors duration-fast ease-standard',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
    'disabled:pointer-events-none disabled:opacity-50'
  ),
  {
    variants: {
      variant: {
        primary: 'bg-caramel-600 text-white hover:bg-caramel-700',
        secondary: 'bg-caramel-100 text-caramel-900 hover:bg-caramel-200',
        success: 'bg-success-600 text-white hover:bg-success-700',
        danger: 'bg-danger-600 text-white hover:bg-danger-700',
        // Was bg-yellow-500 with white text at 1.90:1 -- a clear AA failure.
        warning: 'bg-warning-600 text-white hover:bg-warning-700',
        outline: 'border border-border-strong bg-transparent text-text-primary hover:bg-surface-subtle',
        ghost: 'bg-transparent text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
        link: 'bg-transparent text-caramel-700 underline-offset-4 hover:underline',
      },
      // Matches Input and Select exactly, so the three align in a row.
      size: {
        sm: 'h-8 px-3 text-ui',
        md: 'h-9 px-3.5 text-ui',
        lg: 'h-11 px-5 text-body',
        icon: 'h-9 w-9 p-0',
        'icon-lg': 'h-11 w-11 p-0',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, children, variant, size, fullWidth, isLoading, leftIcon, rightIcon, disabled, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
export { Button, buttonVariants }
