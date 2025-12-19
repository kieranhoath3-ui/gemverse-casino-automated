'use client'

import { createContext, useContext } from 'react'
import { SessionProvider } from 'next-auth/react'

const AuthContext = createContext({})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  )
}