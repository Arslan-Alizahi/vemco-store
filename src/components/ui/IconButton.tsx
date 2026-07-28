'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const iconButtonVariants = cva(
  cn(
    'inline-flex shrink-0 items-center justify-center rounded-sm',
    'transition-colors duration-fast ease-standard',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
    'disabled:pointer-events-none disabled:opacity-50'
  ),
  {
    variants: {
      variant: {
        ghost: 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
        outline:
          'border border-border-subtle text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
        solid: 'bg-caramel-600 text-white hover:bg-caramel-700',
        danger: 'text-danger-600 hover:bg-danger-50',
      },
      // Every size clears the 44px minimum hit area even though the icon
      // inside stays small. The POS quantity steppers were p-1 around a 16px
      // icon -- a 24px target, which is unusable at a counter.
      size: {
        sm: 'h-11 w-11 [&_svg]:h-4 [&_svg]:w-4',
        md: 'h-11 w-11 [&_svg]:h-5 [&_svg]:w-5',
        lg: 'h-12 w-12 [&_svg]:h-5 [&_svg]:w-5',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  }
)

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'>,
    VariantProps<typeof iconButtonVariants> {
  /**
   * Required, and rendered as aria-label.
   *
   * Making it a required prop is the point: roughly fifteen icon-only buttons
   * across admin and the POS ship with no accessible name at all, and a
   * screen reader announces them as "button".
   */
  label: string
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, label, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  )
)

IconButton.displayName = 'IconButton'

export default IconButton
export { IconButton, iconButtonVariants }
