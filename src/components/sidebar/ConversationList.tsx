import { ScrollArea } from '@/components/ui/scroll-area'
import { ConversationItem } from './ConversationItem'
import { MessageSquare } from 'lucide-react'
import type { ConversationWithParticipants } from '@/types'

interface ConversationListProps {
  conversations: ConversationWithParticipants[]
}

export function ConversationList({ conversations }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center px-4 py-8">
        <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-2" />
        <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Search for a user to start chatting</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-0.5">
        {conversations.map((conv) => (
          <ConversationItem key={conv.id} conversation={conv} />
        ))}
      </div>
    </ScrollArea>
  )
}
