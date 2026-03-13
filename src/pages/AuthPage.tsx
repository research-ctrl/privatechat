import { useState } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { Shield } from 'lucide-react'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="bg-primary rounded-2xl p-3">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">PrivateChat</h1>
            <p className="text-sm text-muted-foreground mt-1">
              End-to-end encrypted messaging
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === 'login'
              ? 'Sign in to your encrypted chat'
              : 'Set up your private, encrypted chat account'}
          </p>

          {mode === 'login' ? (
            <LoginForm onSwitch={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitch={() => setMode('login')} />
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Your messages are encrypted with ECDH + AES-256-GCM.
          <br />
          No one — not even the server — can read them.
        </p>
      </div>
    </div>
  )
}
