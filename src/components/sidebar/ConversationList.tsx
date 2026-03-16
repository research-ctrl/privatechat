import { useMemo } from 'react'
import { ConversationItem } from './ConversationItem'
import { MessageSquare } from 'lucide-react'
import type { ConversationWithParticipants } from '@/types'

interface ConversationListProps {
  conversations: ConversationWithParticipants[]
}

export function ConversationList({ conversations }: ConversationListProps) {
  // Sort by most recent message/activity — done here so the store update stays minimal
  const sorted = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        const aTime = new Date(a.lastMessageAt ?? a.updated_at).getTime()
        const bTime = new Date(b.lastMessageAt ?? b.updated_at).getTime()
        return bTime - aTime
      }),
    [conversations]
  )

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center px-4 py-8 gap-2">
        <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground/60">Search for a user above to start chatting</p>
      </div>
    )
  }

  return (
    // Native scroll — avoids Radix ScrollArea viewport issues
    <div className="flex-1 overflow-y-auto">
      <div className="p-2 space-y-0.5">
        {sorted.map((conv) => (
          <ConversationItem key={conv.id} conversation={conv} />
        ))}
      </div>
    </div>
  )
}
