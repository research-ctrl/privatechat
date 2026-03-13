import { cn, formatMessageTime } from '@/lib/utils'
import { ImageMessage } from './ImageMessage'
import type { DecryptedMessage } from '@/types'

interface MessageBubbleProps {
  message: DecryptedMessage
  showAvatar?: boolean
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOwn = message.isOwn ?? false

  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[70%] space-y-1')}>
        {!isOwn && (
          <p className="text-xs text-muted-foreground px-1">{message.sender.username}</p>
        )}
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-card border rounded-bl-sm',
            message.is_deleted && 'opacity-60 italic'
          )}
        >
          {message.message_type === 'image' ? (
            <ImageMessage message={message} />
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
          )}
          <div className={cn('flex items-center justify-end gap-1 mt-1', isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
            <span className="text-[10px]">{formatMessageTime(message.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
