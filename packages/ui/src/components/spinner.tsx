import * as React from "react"
import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

interface SpinnerProps extends React.ComponentProps<"div"> {
  /**
   * Size of the spinner icon
   * @default 24
   */
  size?: number
}

function Spinner({ className, size = 24, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      data-slot="spinner"
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    >
      <Loader2Icon className="animate-spin text-muted-foreground" size={size} />
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export { Spinner }
