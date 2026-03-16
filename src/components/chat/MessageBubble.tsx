import { memo } from 'react'
import { cn, formatMessageTime } from '@/lib/utils'
import { ImageMessage } from './ImageMessage'
import type { DecryptedMessage } from '@/types'

interface MessageBubbleProps {
  message: DecryptedMessage
  prevMessage?: DecryptedMessage
  nextMessage?: DecryptedMessage
}

// Messages within 3 minutes from same sender are visually grouped
const GROUP_THRESHOLD_MS = 3 * 60 * 1000

export const MessageBubble = memo(function MessageBubble({
  message,
  prevMessage,
  nextMessage,
}: MessageBubbleProps) {
  const isOwn = message.isOwn ?? false

  const prevTime = prevMessage ? new Date(prevMessage.created_at).getTime() : 0
  const currTime = new Date(message.created_at).getTime()
  const nextTime = nextMessage ? new Date(nextMessage.created_at).getTime() : Infinity

  // Is this message grouped with the previous one (same sender, close in time)?
  const isGroupedWithPrev =
    !!prevMessage &&
    prevMessage.sender_id === message.sender_id &&
    currTime - prevTime < GROUP_THRESHOLD_MS

  // Is this message grouped with the next one (affects tail rendering)?
  const isGroupedWithNext =
    !!nextMessage &&
    nextMessage.sender_id === message.sender_id &&
    nextTime - currTime < GROUP_THRESHOLD_MS

  // Space between groups vs within group
  const topMargin = isGroupedWithPrev ? 'mt-0.5' : 'mt-2'

  // Tail: shown only on the LAST message of a group
  const showTail = !isGroupedWithNext

  return (
    <div className={cn('flex items-end gap-1', isOwn ? 'justify-end' : 'justify-start', topMargin)}>
      <div className={cn('max-w-[75%] sm:max-w-[65%]', isOwn ? 'items-end' : 'items-start', 'flex flex-col')}>
        {/* Sender label for received messages (only first in a group) */}
        {!isOwn && !isGroupedWithPrev && (
          <span className="text-xs font-medium text-primary px-2 mb-0.5">
            {message.sender.username}
          </span>
        )}

        <div
          className={cn(
            'relative px-3 py-1.5 text-sm shadow-sm',
            // Own messages: WhatsApp green
            isOwn
              ? 'bg-[hsl(var(--bubble-out))] text-[hsl(var(--bubble-out-fg))]'
              : 'bg-[hsl(var(--bubble-in))] text-[hsl(var(--bubble-in-fg))]',
            // Rounded corners — flat on the grouped side
            isOwn
              ? cn(
                  'rounded-2xl',
                  isGroupedWithPrev ? 'rounded-tr-md' : 'rounded-tr-2xl',
                  showTail ? 'rounded-br-sm' : 'rounded-br-md'
                )
              : cn(
                  'rounded-2xl',
                  isGroupedWithPrev ? 'rounded-tl-md' : 'rounded-tl-2xl',
                  showTail ? 'rounded-bl-sm' : 'rounded-bl-md'
                ),
            message.is_deleted && 'opacity-60 italic'
          )}
        >
          {message.message_type === 'image' ? (
            <ImageMessage message={message} />
          ) : (
            <p className="whitespace-pre-wrap break-words leading-snug pr-10">
              {message.content}
            </p>
          )}

          {/* Timestamp — overlaid bottom-right for text, below for image */}
          <span
            className={cn(
              'text-[10px] leading-none select-none',
              message.message_type === 'image'
                ? 'block text-right mt-1 opacity-80'
                : 'absolute bottom-1.5 right-2.5 opacity-70'
            )}
          >
            {formatMessageTime(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
})
