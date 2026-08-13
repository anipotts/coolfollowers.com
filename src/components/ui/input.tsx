import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-2xl border-0 bg-input px-4 text-base text-foreground shadow-[inset_0_0_0_1px_rgba(7,24,61,0.08),0_8px_20px_rgba(35,79,130,0.06)] outline-none transition-[box-shadow,background-color] placeholder:text-muted-foreground focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
