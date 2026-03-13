import { Shield, MessageSquare } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 bg-muted/30">
      <div className="relative">
        <div className="bg-primary/10 rounded-full p-6">
          <MessageSquare className="h-12 w-12 text-primary/60" />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border">
          <Shield className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div>
        <h2 className="font-semibold text-lg">Welcome to PrivateChat</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          All messages are end-to-end encrypted. Select a conversation or search for a user to start chatting.
        </p>
      </div>
      <div className="bg-card border rounded-lg p-4 max-w-xs text-left space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Security</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>✓ ECDH key exchange</li>
          <li>✓ AES-256-GCM message encryption</li>
          <li>✓ Private key never leaves your device</li>
          <li>✓ Encrypted images in storage</li>
        </ul>
      </div>
    </div>
  )
}
