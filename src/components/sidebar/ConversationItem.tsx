import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useChatStore } from '@/store/useChatStore'
import { cn, getInitials, formatConversationTime } from '@/lib/utils'
import type { ConversationWithParticipants } from '@/types'

interface ConversationItemProps {
  conversation: ConversationWithParticipants
}

export function ConversationItem({ conversation }: ConversationItemProps) {
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)
  const isActive = activeConversationId === conversation.id
  const { otherUser } = conversation

  return (
    <button
      onClick={() => setActiveConversation(conversation.id)}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-colors text-left',
        isActive ? 'bg-primary/10' : 'hover:bg-muted'
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        {otherUser?.avatar_url && (
          <img src={otherUser.avatar_url} alt={otherUser.username} className="aspect-square object-cover" />
        )}
        <AvatarFallback className="bg-primary/20 text-primary font-medium">
          {getInitials(otherUser?.display_name ?? otherUser?.username ?? '??')}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={cn('text-sm font-medium truncate', isActive && 'text-primary')}>
            {otherUser?.username ?? 'Unknown'}
          </span>
          {conversation.lastMessageAt && (
            <span className="text-xs text-muted-foreground shrink-0 ml-2">
              {formatConversationTime(conversation.lastMessageAt)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {conversation.lastMessagePreview ?? '[Encrypted]'}
        </p>
      </div>
    </button>
  )
}
