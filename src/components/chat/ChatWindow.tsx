import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { useMessages } from '@/hooks/useMessages'
import { useKeyStore } from '@/store/useKeyStore'
import { getInitials } from '@/lib/utils'
import { Shield, Lock, ArrowLeft } from 'lucide-react'
import type { ConversationWithParticipants } from '@/types'

interface ChatWindowProps {
  conversation: ConversationWithParticipants
  onBack?: () => void
}

export function ChatWindow({ conversation, onBack }: ChatWindowProps) {
  const { messages } = useMessages(conversation.id)
  const hasPrivateKey = useKeyStore((s) => s.privateKey !== null)
  const { otherUser } = conversation

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1 -ml-1 rounded-md hover:bg-muted text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <Avatar className="h-9 w-9">
          {otherUser?.avatar_url && (
            <img src={otherUser.avatar_url} alt={otherUser.username} className="aspect-square object-cover" />
          )}
          <AvatarFallback className="bg-primary/20 text-primary font-medium text-sm">
            {getInitials(otherUser?.display_name ?? otherUser?.username ?? '?')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{otherUser?.username}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>End-to-end encrypted</span>
          </div>
        </div>
        <Shield className="h-4 w-4 text-primary/60" />
      </div>

      {/* No private key warning */}
      {!hasPrivateKey && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-xs text-yellow-700 text-center">
          Session expired — please sign in again to decrypt messages
        </div>
      )}

      {/* Messages */}
      <MessageList conversationId={conversation.id} messages={messages} />

      {/* Input */}
      <MessageInput conversation={conversation} />
    </div>
  )
}
