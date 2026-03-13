import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { UserSearch } from './UserSearch'
import { ConversationList } from './ConversationList'
import { useAuthStore } from '@/store/useAuthStore'
import { useConversations } from '@/hooks/useConversations'
import { getInitials } from '@/lib/utils'
import { LogOut, Shield } from 'lucide-react'

export function Sidebar() {
  const { profile, signOut } = useAuthStore()
  const { conversations } = useConversations()

  return (
    <div className="flex flex-col h-full border-r bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">PrivateChat</span>
        </div>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/20 text-primary font-medium">
              {getInitials(profile?.display_name ?? profile?.username ?? '?')}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={signOut}
            title="Sign out"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <UserSearch />
      </div>

      {/* Conversations */}
      <ConversationList conversations={conversations} />

      {/* Footer */}
      <div className="p-3 border-t">
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" />
          End-to-end encrypted
        </p>
      </div>
    </div>
  )
}
