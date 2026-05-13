import { Badge as BadgeBase, badgeVariants } from "../badge"
import type { VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import React from "react"

type LegacyColor = "success" | "warning" | "error" | "destructive" | "info" | "blue" | "default"
type LegacyVariant = "solid" | "light" | "outline" | "default" | "secondary" | "ghost"
type LegacySize = "sm" | "md" | "lg"

const colorClass: Record<LegacyColor, string> = {
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-orange-100 text-orange-700 border-orange-200",
  error: "bg-red-100 text-red-700 border-red-200",
  destructive: "bg-red-100 text-red-700 border-red-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  default: "",
}

const sizeClass: Record<LegacySize, string> = {
  sm: "text-[10px] px-1.5 py-0",
  md: "text-xs px-2 py-0.5",
  lg: "text-sm px-3 py-1",
}

interface BadgeLegacyProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: LegacyColor
  variant?: LegacyVariant | VariantProps<typeof badgeVariants>["variant"]
  size?: LegacySize
}

function Badge({ color, variant, size, className, ...props }: BadgeLegacyProps) {
  const mapped: VariantProps<typeof badgeVariants>["variant"] =
    variant === "outline" ? "outline"
    : variant === "ghost" ? "ghost"
    : variant === "secondary" ? "secondary"
    : "default"

  return (
    <BadgeBase
      variant={mapped}
      className={cn(
        color ? (colorClass[color] ?? "") : "",
        size ? (sizeClass[size] ?? "") : "",
        className
      )}
      {...(props as any)}
    />
  )
}

export default Badge
export { Badge }
