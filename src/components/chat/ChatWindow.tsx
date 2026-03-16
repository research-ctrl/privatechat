import { useEffect } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { useMessages } from '@/hooks/useMessages'
import { useKeyStore } from '@/store/useKeyStore'
import { useChatStore } from '@/store/useChatStore'
import { getInitials } from '@/lib/utils'
import { Lock, ArrowLeft } from 'lucide-react'
import type { ConversationWithParticipants } from '@/types'

interface ChatWindowProps {
  conversation: ConversationWithParticipants
  onBack?: () => void
}

export function ChatWindow({ conversation, onBack }: ChatWindowProps) {
  const { messages } = useMessages(conversation.id)
  const hasPrivateKey = useKeyStore((s) => s.privateKey !== null)
  const clearUnread = useChatStore((s) => s.clearUnread)
  const { otherUser } = conversation

  // Clear unread badge as soon as the conversation is opened
  useEffect(() => {
    clearUnread(conversation.id)
  }, [conversation.id, clearUnread])

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b bg-card shadow-sm z-10">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
        )}

        <Avatar className="h-10 w-10 shrink-0">
          {otherUser?.avatar_url && (
            <img
              src={otherUser.avatar_url}
              alt={otherUser.username}
              className="aspect-square object-cover"
            />
          )}
          <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
            {getInitials(otherUser?.display_name ?? otherUser?.username ?? '?')}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate leading-tight">
            {otherUser?.display_name ?? otherUser?.username ?? 'Unknown'}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
            <Lock className="h-2.5 w-2.5" />
            <span>End-to-end encrypted</span>
          </div>
        </div>
      </div>

      {/* ── Session expired warning ────────────────────────────────────── */}
      {!hasPrivateKey && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-xs text-amber-700 dark:text-amber-400 text-center">
          ⚠️ Session expired — please sign in again to decrypt messages
        </div>
      )}

      {/* ── Message list ──────────────────────────────────────────────── */}
      <MessageList conversationId={conversation.id} messages={messages} />

      {/* ── Input bar ─────────────────────────────────────────────────── */}
      <MessageInput conversation={conversation} />
    </div>
  )
}
