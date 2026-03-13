import { useState, useEffect } from 'react'
import { downloadAndDecryptImage } from '@/lib/storage'
import { useKeyStore } from '@/store/useKeyStore'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { DecryptedMessage } from '@/types'

interface ImageMessageProps {
  message: DecryptedMessage
}

export function ImageMessage({ message }: ImageMessageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { getOrDeriveSharedKey } = useKeyStore()
  const userId = useAuthStore((s) => s.userId)

  useEffect(() => {
    let objectUrl: string | null = null

    const load = async () => {
      try {
        // message.content for image type = "ciphertext|||iv"
        const parts = message.content.split('|||')
        if (parts.length !== 2) throw new Error('Invalid image message format')
        const [ciphertext, iv] = parts

        let otherUserId: string
        if (message.isOwn) {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', message.conversation_id)
            .neq('user_id', userId ?? '')
          if (!participants?.[0]) throw new Error('No recipient found')
          otherUserId = participants[0].user_id
        } else {
          otherUserId = message.sender_id
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, public_key')
          .eq('id', otherUserId)
          .single()

        if (!profile) throw new Error('Profile not found')

        const sharedKey = await getOrDeriveSharedKey(profile.id, profile.public_key)
        objectUrl = await downloadAndDecryptImage(ciphertext, iv, sharedKey)
        setImageUrl(objectUrl)
      } catch {
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    load()

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [message, userId, getOrDeriveSharedKey])

  if (isLoading) {
    return (
      <div className="w-48 h-32 rounded-lg bg-muted animate-pulse flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading image...</span>
      </div>
    )
  }

  if (hasError || !imageUrl) {
    return (
      <div className="w-48 h-20 rounded-lg bg-muted/50 flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Failed to load image</span>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="block rounded-lg overflow-hidden max-w-xs hover:opacity-90 transition-opacity"
      >
        <img
          src={imageUrl}
          alt="Shared image"
          className="max-w-full max-h-64 object-cover rounded-lg"
        />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader>
            <DialogTitle className="sr-only">Image preview</DialogTitle>
          </DialogHeader>
          <img src={imageUrl} alt="Full size preview" className="w-full h-auto rounded-lg" />
        </DialogContent>
      </Dialog>
    </>
  )
}
