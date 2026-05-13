import { Badge as BadgeBase, badgeVariants } from "../badge"
import type { VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import React from "react"

type LegacyColor = "success" | "warning" | "error" | "destructive" | "info" | "blue" | "default" | "light" | "indigo" | "primary" | "dark"
type LegacyVariant = "solid" | "light" | "outline" | "default" | "secondary" | "ghost"
type LegacySize = "sm" | "md" | "lg"

const colorClass: Record<LegacyColor, string> = {
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-orange-100 text-orange-700 border-orange-200",
  error: "bg-red-100 text-red-700 border-red-200",
  destructive: "bg-red-100 text-red-700 border-red-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  light: "bg-gray-100 text-gray-600 border-gray-200",
  indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
  primary: "bg-brand-100 text-brand-700 border-brand-200",
  dark: "bg-gray-800 text-white border-gray-700",
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
  startIcon?: React.ReactNode
}

function Badge({ color, variant, size, startIcon, className, children, ...props }: BadgeLegacyProps) {
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
    >
      {startIcon && <span className="mr-1 inline-flex">{startIcon}</span>}
      {children}
    </BadgeBase>
  )
}

export default Badge
export { Badge }
