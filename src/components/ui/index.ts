/**
 * Component barrel.
 *
 * The twelve files here shipped five different export conventions — some
 * default-only, some named-only, some both — so call sites had to remember
 * which was which. Everything is exported by name from here; the individual
 * files keep their default exports so existing imports still resolve.
 */

// Layout
export { default as Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card'
export { default as Modal } from './Modal'

// Controls
export { default as Button, buttonVariants } from './Button'
export { default as IconButton, iconButtonVariants } from './IconButton'
export { default as Input } from './Input'
export { default as Select } from './Select'
export { default as Checkbox } from './Checkbox'
export { default as Textarea } from './Textarea'
export { FormField, controlBase, controlSize } from './FormField'
export type { ControlSize, FieldProps } from './FormField'

// Display
export { default as Badge, badgeVariants, StatusBadge, StockBadge } from './Badge'
export { default as Money, Numeric } from './Money'
export { Carousel } from './Carousel'

// Feedback
export { default as Spinner, LoadingDots, FullPageSpinner } from './Spinner'
export { default as Skeleton, ProductCardSkeleton, SkeletonText } from './Skeleton'
export { default as EmptyState } from './EmptyState'
export { default as ErrorState } from './ErrorState'
export { default as ConfirmDialog } from './ConfirmDialog'
export { ToastProvider, useToast } from './Toast'
export type { Toast, ToastType, ToastAction } from './Toast'

// Motion
export { Reveal } from './motion/Reveal'
export { Tilt } from './motion/Tilt'
export { Parallax } from './motion/Parallax'
export { AnimatedCounter } from './motion/AnimatedCounter'
