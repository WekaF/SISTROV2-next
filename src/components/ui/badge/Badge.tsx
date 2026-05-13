import { Badge as BadgeBase, badgeVariants } from "../badge"
import type { VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import React from "react"

type LegacyColor = "success" | "warning" | "error" | "destructive" | "info" | "blue" | "default"
type LegacyVariant = "solid" | "outline" | "default" | "secondary" | "ghost"

const colorClass: Record<LegacyColor, string> = {
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-orange-100 text-orange-700 border-orange-200",
  error: "bg-red-100 text-red-700 border-red-200",
  destructive: "bg-red-100 text-red-700 border-red-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  default: "",
}

interface BadgeLegacyProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: LegacyColor
  variant?: LegacyVariant | VariantProps<typeof badgeVariants>["variant"]
}

function Badge({ color, variant, className, ...props }: BadgeLegacyProps) {
  const mapped = variant === "outline"
    ? "outline"
    : (variant === "solid" || !variant)
      ? "default"
      : variant as VariantProps<typeof badgeVariants>["variant"]

  return (
    <BadgeBase
      variant={mapped}
      className={cn(color ? (colorClass[color] ?? "") : "", className)}
      {...(props as any)}
    />
  )
}

export default Badge
export { Badge }
