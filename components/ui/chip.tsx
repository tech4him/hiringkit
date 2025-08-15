import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ChipProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  dismissible?: boolean
  onDismiss?: () => void
}

const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ className, variant = 'default', size = 'md', dismissible = false, onDismiss, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 font-medium transition-colors rounded-full border select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          {
            'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15': variant === 'default',
            'bg-secondary text-secondary-foreground border-secondary/50 hover:bg-secondary/80': variant === 'secondary',
            'bg-green-100 text-green-800 border-green-200 hover:bg-green-150': variant === 'success',
            'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-150': variant === 'warning',
            'bg-red-100 text-red-800 border-red-200 hover:bg-red-150': variant === 'destructive',
          },
          {
            'h-6 px-2 text-xs': size === 'sm',
            'h-7 px-3 text-sm': size === 'md',
            'h-8 px-4 text-sm': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      >
        <span className="truncate">
          {children}
        </span>
        {dismissible && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss?.()
            }}
            className={cn(
              "rounded-full p-0.5 hover:bg-black/10 transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              {
                'h-3 w-3': size === 'sm',
                'h-4 w-4': size === 'md' || size === 'lg',
              }
            )}
          >
            <X className={cn(
              {
                'h-2 w-2': size === 'sm',
                'h-3 w-3': size === 'md' || size === 'lg',
              }
            )} />
            <span className="sr-only">Remove</span>
          </button>
        )}
      </div>
    )
  }
)
Chip.displayName = "Chip"

export { Chip }