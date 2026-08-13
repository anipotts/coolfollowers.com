import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-base font-bold outline-none transition-[transform,background-color,box-shadow] disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-4 focus-visible:ring-ring/25 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_14px_34px_rgba(23,105,236,0.3)] hover:bg-primary-hover hover:shadow-[0_16px_38px_rgba(23,105,236,0.36)]",
        outline:
          "bg-white text-foreground shadow-[0_10px_28px_rgba(35,79,130,0.12)] hover:bg-surface-hover",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_10px_28px_rgba(35,79,130,0.1)] hover:bg-surface-hover",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-10 rounded-xl px-4 text-sm",
        lg: "h-16 rounded-[1.25rem] px-10 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
