"use client"
import React from "react";

type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
type BadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark"
  | "indigo"
  | "emerald"
  | "amber"
  | "rose"
  | "blue";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: BadgeColor;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
  className = "",
}) => {
  const baseStyles =
    "inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium whitespace-nowrap";

  const sizeStyles = {
    sm: "text-[10px]",
    md: "text-xs",
  };

  const variants = {
    light: {
      primary:
        "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
      success:
        "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-500",
      error:
        "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-500",
      warning:
        "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
      info: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-500",
      light: "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80",
      dark: "bg-gray-500 text-white dark:bg-white/5 dark:text-white",
      indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
      emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
      amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
      rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
      blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    },
    solid: {
      primary: "bg-brand-500 text-white dark:text-white",
      success: "bg-green-500 text-white dark:text-white",
      error: "bg-red-500 text-white dark:text-white",
      warning: "bg-orange-500 text-white dark:text-white",
      info: "bg-blue-500 text-white dark:text-white",
      light: "bg-gray-400 dark:bg-white/5 text-white dark:text-white/80",
      dark: "bg-gray-700 text-white dark:text-white",
      indigo: "bg-indigo-500 text-white",
      emerald: "bg-emerald-500 text-white",
      amber: "bg-amber-500 text-white",
      rose: "bg-rose-500 text-white",
      blue: "bg-blue-500 text-white",
    },
  };

  const sizeClass = sizeStyles[size];
  // Safe access to color styles
  const currentVariant = variants[variant] || variants.light;
  const colorStyles = currentVariant[color as keyof typeof currentVariant] || currentVariant.primary;

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles} ${className}`}>
      {startIcon && startIcon}
      {children}
      {endIcon && endIcon}
    </span>
  );
};

export default Badge;
