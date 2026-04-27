"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"

export type ToastVariant = "default" | "success" | "destructive" | "warning" | "info"

interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  onClose: (id: string) => void
}

const Toast: React.FC<ToastProps> = ({ id, title, description, variant = "default", onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => onClose(id), 5000)
    return () => clearTimeout(timer)
  }, [id, onClose])

  const getIcon = () => {
    switch (variant) {
      case "success": return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      case "destructive": return <AlertCircle className="h-5 w-5 text-red-500" />
      case "warning": return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case "info": return <Info className="h-5 w-5 text-blue-500" />
      default: return null
    }
  }

  const getStyles = () => {
    switch (variant) {
      case "success": return "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-500/20"
      case "destructive": return "bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-500/20"
      case "warning": return "bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-500/20"
      case "info": return "bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-500/20"
      default: return "bg-white border-gray-200 dark:bg-gray-dark dark:border-gray-800"
    }
  }

  return (
    <div className={cn(
      "flex w-full max-w-sm gap-3 p-4 rounded-2xl border shadow-lg animate-in slide-in-from-right-full duration-300",
      getStyles()
    )}>
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 space-y-1">
        {title && <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{title}</h4>}
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>}
      </div>
      <button 
        onClick={() => onClose(id)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Omit<ToastProps, "onClose">[]>([])

  const addToast = (toast: Omit<ToastProps, "id" | "onClose">) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none [&>*]:pointer-events-auto">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const ToastContext = React.createContext<{ addToast: (toast: Omit<ToastProps, "id" | "onClose">) => void } | undefined>(undefined)

export const useToast = () => {
  const context = React.useContext(ToastContext)
  if (!context) throw new Error("useToast must be used within a ToastProvider")
  return context
}
