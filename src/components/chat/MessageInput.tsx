import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Paperclip, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { encryptMessage } from '@/lib/crypto'
import { encryptAndUploadImage } from '@/lib/storage'
import { useAuthStore } from '@/store/useAuthStore'
import { useKeyStore } from '@/store/useKeyStore'
import { useTyping } from '@/hooks/useTyping'
import type { ConversationWithParticipants } from '@/types'

interface MessageInputProps {
  conversation: ConversationWithParticipants
}

export function MessageInput({ conversation }: MessageInputProps) {
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const userId = useAuthStore((s) => s.userId)
  const getOrDeriveSharedKey = useKeyStore((s) => s.getOrDeriveSharedKey)
  const hasPrivateKey = useKeyStore((s) => s.privateKey !== null)
  const { startTyping, stopTyping } = useTyping(conversation.id)

  const getOtherUser = useCallback(() => {
    return conversation.participants.find((p) => p.id !== userId)
  }, [conversation, userId])

  const send = useCallback(async () => {
    if ((!text.trim() && !imagePreview) || isSending) return
    if (!hasPrivateKey) {
      setSendError('Session expired — please sign in again')
      return
    }

    const otherUser = getOtherUser()
    if (!otherUser) {
      setSendError('Could not find recipient')
      return
    }

    setIsSending(true)
    setSendError(null)
    try {
      const sharedKey = await getOrDeriveSharedKey(otherUser.id, otherUser.public_key)

      if (imagePreview) {
        const { ciphertext, iv } = await encryptAndUploadImage(
          imagePreview.file,
          userId ?? '',
          sharedKey
        )

        const { error } = await supabase.from('messages').insert({
          conversation_id: conversation.id,
          sender_id: userId,
          ciphertext,
          iv,
          message_type: 'image',
        })
        if (error) throw new Error(error.message)

        URL.revokeObjectURL(imagePreview.url)
        setImagePreview(null)
      } else {
        const { ciphertext, iv } = await encryptMessage(text.trim(), sharedKey)
        const { error } = await supabase.from('messages').insert({
          conversation_id: conversation.id,
          sender_id: userId,
          ciphertext,
          iv,
          message_type: 'text',
        })
        if (error) throw new Error(error.message)
        setText('')
      }

      void stopTyping()

      // Update conversation timestamp
      void supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversation.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send'
      console.error('Failed to send message:', err)
      setSendError(msg)
    } finally {
      setIsSending(false)
      textareaRef.current?.focus()
    }
  }, [text, imagePreview, isSending, hasPrivateKey, getOtherUser, getOrDeriveSharedKey, userId, conversation.id, stopTyping])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) {
      setSendError('Image must be under 10MB')
      return
    }
    const url = URL.createObjectURL(file)
    setImagePreview({ file, url })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview.url)
    setImagePreview(null)
  }

  return (
    <div className="border-t bg-card p-3 space-y-2">
      {sendError && (
        <div className="text-xs text-destructive text-center">{sendError}</div>
      )}

      {imagePreview && (
        <div className="relative inline-block">
          <img
            src={imagePreview.url}
            alt="Preview"
            className="h-20 w-20 object-cover rounded-lg border"
          />
          <button
            onClick={clearImage}
            className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          title="Attach image"
        >
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        </Button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setSendError(null)
            void startTyping()
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => void stopTyping()}
          placeholder={imagePreview ? 'Add a caption...' : 'Type a message...'}
          rows={1}
          disabled={isSending}
          className="flex-1 resize-none rounded-2xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px] max-h-[120px] disabled:opacity-50"
        />

        <Button
          type="button"
          size="icon"
          className="shrink-0 h-10 w-10 rounded-full"
          onClick={send}
          disabled={isSending || (!text.trim() && !imagePreview)}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
