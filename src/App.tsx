import { useEffect } from 'react'
import { AuthPage } from '@/pages/AuthPage'
import { ChatPage } from '@/pages/ChatPage'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/store/useAuthStore'

function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  return (
    <>
      <AuthGuard fallback={<AuthPage />}>
        <ChatPage />
      </AuthGuard>
      <Toaster />
    </>
  )
}

export default App
