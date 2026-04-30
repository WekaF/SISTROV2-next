"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

export type Role =
  | "superadmin"
  | "admin"
  | "candal"
  | "staffarea"
  | "viewer"
  | "rekanan"
  | "transport"
  | "security"
  | "gudang"
  | "jembatan_timbang"
  | "pod"
  | "pkd"
  | "eksternal"

interface User {
  name: string
  email: string
  role: Role
  avatar?: string
}

interface AuthContextType {
  user: User | null
  login: (role: Role) => void
  logout: () => void
  setRole: (role: Role) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>({
    name: "SISTRO Admin",
    email: "admin@sistro.com",
    role: "superadmin",
  })

  const login = (role: Role) => {
    setUser({
      name: `SISTRO ${role.replace("_", " ").toUpperCase()}`,
      email: `${role}@sistro.com`,
      role,
    })
  }

  const logout = () => {
    setUser(null)
  }

  const setRole = (role: Role) => {
    if (user) {
      setUser({ ...user, role })
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, setRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
