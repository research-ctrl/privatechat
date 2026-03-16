import { memo } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useChatStore } from '@/store/useChatStore'
import { cn, getInitials, formatConversationTime } from '@/lib/utils'
import type { ConversationWithParticipants } from '@/types'

interface ConversationItemProps {
  conversation: ConversationWithParticipants
}

export const ConversationItem = memo(function ConversationItem({
  conversation,
}: ConversationItemProps) {
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)
  const unreadCount = useChatStore((s) => s.unreadCounts[conversation.id] ?? 0)

  const isActive = activeConversationId === conversation.id
  const { otherUser } = conversation

  return (
    <button
      onClick={() => setActiveConversation(conversation.id)}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-150 text-left',
        isActive
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-muted/70 border border-transparent'
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          {otherUser?.avatar_url && (
            <img
              src={otherUser.avatar_url}
              alt={otherUser.username}
              className="aspect-square object-cover"
            />
          )}
          <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
            {getInitials(otherUser?.display_name ?? otherUser?.username ?? '??')}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-sm font-semibold truncate',
              isActive ? 'text-primary' : 'text-foreground'
            )}
          >
            {otherUser?.display_name ?? otherUser?.username ?? 'Unknown'}
          </span>
          <span
            className={cn(
              'text-[11px] shrink-0 tabular-nums',
              unreadCount > 0 ? 'text-primary font-medium' : 'text-muted-foreground'
            )}
          >
            {conversation.lastMessageAt
              ? formatConversationTime(conversation.lastMessageAt)
              : ''}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={cn(
              'text-xs truncate',
              unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}
          >
            {conversation.lastMessagePreview ?? '🔒 Encrypted'}
          </p>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
})
