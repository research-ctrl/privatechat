import { useAuthStore } from '@/store/useAuthStore'
import type { ReactNode } from 'react'

interface AuthGuardProps {
  children: ReactNode
  fallback: ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const userId = useAuthStore((s) => s.userId)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!userId) return <>{fallback}</>
  return <>{children}</>
}
