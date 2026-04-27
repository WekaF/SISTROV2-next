"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Info, CheckCircle2, Loader2 } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "info" | "success"
  isLoading?: boolean
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "Continue",
  cancelText = "Cancel",
  variant = "info",
  isLoading = false,
}) => {
  const getIcon = () => {
    switch (variant) {
      case "danger":
        return <AlertTriangle className="h-6 w-6 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-orange-500" />
      case "success":
        return <CheckCircle2 className="h-6 w-6 text-emerald-500" />
      default:
        return <Info className="h-6 w-6 text-blue-500" />
    }
  }

  const getConfirmButtonStyles = () => {
    switch (variant) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white"
      case "warning":
        return "bg-orange-500 hover:bg-orange-600 text-white"
      case "success":
        return "bg-emerald-500 hover:bg-emerald-600 text-white"
      default:
        return "bg-brand-500 hover:bg-brand-600 text-white"
    }
  }

  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader className="flex flex-col items-center gap-4 text-center sm:text-center">
          <div className={`p-3 rounded-full ${
            variant === 'danger' ? 'bg-red-50 dark:bg-red-500/10' : 
            variant === 'warning' ? 'bg-orange-50 dark:bg-orange-500/10' : 
            variant === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 
            'bg-blue-50 dark:bg-blue-500/10'
          }`}>
            {getIcon()}
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-xl">{title}</DialogTitle>
            <DialogDescription className="text-sm">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-4 sm:justify-center gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              onCancel?.()
              onOpenChange(false)
            }}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 ${getConfirmButtonStyles()}`}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDialog
