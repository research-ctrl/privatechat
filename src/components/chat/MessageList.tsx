import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { useChatStore } from '@/store/useChatStore'
import { useAuthStore } from '@/store/useAuthStore'
import type { DecryptedMessage } from '@/types'

interface MessageListProps {
  conversationId: string
  messages: DecryptedMessage[]
}

export function MessageList({ conversationId, messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingUsers = useChatStore((s) => s.typingUsers[conversationId] ?? [])
  const userId = useAuthStore((s) => s.userId)
  const isTyping = typingUsers.filter((id) => id !== userId).length > 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isTyping])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="px-4 py-4 space-y-2">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
