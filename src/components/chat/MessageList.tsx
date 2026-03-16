import { useEffect, useRef, useMemo } from 'react'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { useChatStore } from '@/store/useChatStore'
import { useAuthStore } from '@/store/useAuthStore'
import type { DecryptedMessage } from '@/types'

interface MessageListProps {
  conversationId: string
  messages: DecryptedMessage[]
}

const EMPTY_TYPING: string[] = []

export function MessageList({ conversationId, messages }: MessageListProps) {
  // Use a native div instead of Radix ScrollArea so scrollTop is fully controlled
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)
  // Track if we've done the first paint scroll for this conversation
  const initialScrollDoneRef = useRef(false)

  const typingUsers = useChatStore((s) => s.typingUsers[conversationId]) ?? EMPTY_TYPING
  const userId = useAuthStore((s) => s.userId)
  const isTyping = useMemo(() => typingUsers.some((id) => id !== userId), [typingUsers, userId])

  // Reset state when the active conversation changes
  useEffect(() => {
    initialScrollDoneRef.current = false
    prevLengthRef.current = 0
  }, [conversationId])

  // Auto-scroll: instant on initial load, smooth when new message arrives
  useEffect(() => {
    const el = containerRef.current
    if (!el || messages.length === 0) return

    const isNewMsg = initialScrollDoneRef.current && messages.length > prevLengthRef.current

    // requestAnimationFrame ensures the DOM has updated before we measure scrollHeight
    requestAnimationFrame(() => {
      const container = containerRef.current
      if (!container) return
      if (isNewMsg) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
      } else {
        // Initial load: jump instantly to bottom (no animation)
        container.scrollTop = container.scrollHeight
        initialScrollDoneRef.current = true
      }
    })

    prevLengthRef.current = messages.length
  }, [messages.length])

  // Scroll when typing indicator appears
  useEffect(() => {
    if (!isTyping) return
    requestAnimationFrame(() => {
      const container = containerRef.current
      if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    })
  }, [isTyping])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto chat-bg"
      style={{ overscrollBehavior: 'contain' }}
    >
      <div className="px-3 py-3 flex flex-col gap-0.5">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-xs text-foreground/60 bg-background/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
              No messages yet. Say hello! 👋
            </span>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              prevMessage={messages[i - 1]}
              nextMessage={messages[i + 1]}
            />
          ))
        )}
        {isTyping && <TypingIndicator />}
      </div>
    </div>
  )
}
