import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useChatStore } from '@/store/useChatStore'
import { useKeyStore } from '@/store/useKeyStore'
import { decryptMessage } from '@/lib/crypto'
import type { Message, DecryptedMessage, Profile } from '@/types'

export function useMessages(conversationId: string | null) {
  const userId = useAuthStore((s) => s.userId)
  const messages = useChatStore((s) => s.messages)
  const setMessages = useChatStore((s) => s.setMessages)
  const addMessage = useChatStore((s) => s.addMessage)
  const updateConversationLastMessage = useChatStore((s) => s.updateConversationLastMessage)
  const getOrDeriveSharedKey = useKeyStore((s) => s.getOrDeriveSharedKey)

  // Stable ref holds latest values — updated every render, never causes effect re-runs
  const stableRef = useRef({ userId, setMessages, addMessage, updateConversationLastMessage, getOrDeriveSharedKey })
  stableRef.current = { userId, setMessages, addMessage, updateConversationLastMessage, getOrDeriveSharedKey }

  const profileCacheRef = useRef<Map<string, Profile>>(new Map())

  useEffect(() => {
    if (!conversationId) return

    const getProfile = async (profileId: string): Promise<Profile | null> => {
      const cached = profileCacheRef.current.get(profileId)
      if (cached) return cached
      const { data } = await supabase.from('profiles').select('*').eq('id', profileId).single()
      if (data) {
        profileCacheRef.current.set(profileId, data as Profile)
        return data as Profile
      }
      return null
    }

    const decryptOneMessage = async (msg: Message): Promise<DecryptedMessage | null> => {
      const { userId, getOrDeriveSharedKey } = stableRef.current
      try {
        if (!useKeyStore.getState().privateKey) {
          const sender = await getProfile(msg.sender_id)
          return {
            id: msg.id,
            conversation_id: msg.conversation_id,
            sender_id: msg.sender_id,
            message_type: msg.message_type,
            is_deleted: msg.is_deleted,
            created_at: msg.created_at,
            content: '[Encrypted]',
            sender: sender ?? { id: msg.sender_id, username: '?', display_name: null, avatar_url: null, public_key: '', created_at: '', updated_at: '' },
            isOwn: msg.sender_id === userId,
          }
        }

        const sender = await getProfile(msg.sender_id)
        if (!sender) return null

        const conversations = useChatStore.getState().conversations
        const conversation = conversations.find((c) => c.id === conversationId)

        const otherUserId = msg.sender_id === userId
          ? conversation?.participants.find((p) => p.id !== userId)?.id ?? msg.sender_id
          : msg.sender_id

        const otherProfile = await getProfile(otherUserId)
        if (!otherProfile) return null

        const sharedKey = await getOrDeriveSharedKey(otherUserId, otherProfile.public_key)
        const content = msg.is_deleted
          ? '[Message deleted]'
          : msg.message_type === 'image'
            ? `${msg.ciphertext}|||${msg.iv}`
            : await decryptMessage(msg.ciphertext, msg.iv, sharedKey)

        return {
          id: msg.id,
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          message_type: msg.message_type,
          is_deleted: msg.is_deleted,
          created_at: msg.created_at,
          content,
          sender,
          isOwn: msg.sender_id === userId,
        }
      } catch (err) {
        console.error('Failed to decrypt message:', err)
        return null
      }
    }

    const fetchMessages = async () => {
      const { userId, setMessages } = stableRef.current
      if (!userId) return
      try {
        const { data: rawMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(100)

        if (!rawMessages) return

        const decrypted: DecryptedMessage[] = []
        for (const msg of rawMessages) {
          const dm = await decryptOneMessage(msg as Message)
          if (dm) decrypted.push(dm)
        }
        setMessages(conversationId, decrypted)
      } catch (err) {
        console.error('fetchMessages failed:', err)
      }
    }

    fetchMessages()

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { addMessage, updateConversationLastMessage } = stableRef.current
          try {
            const msg = payload.new as Message
            const dm = await decryptOneMessage(msg)
            if (dm) {
              addMessage(conversationId, dm)
              updateConversationLastMessage(
                conversationId,
                dm.message_type === 'image' ? '📷 Image' : dm.content.slice(0, 40),
                dm.created_at
              )
            }
          } catch (err) {
            console.error('Realtime message handling failed:', err)
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [conversationId]) // ← only re-runs when conversation changes

  return { messages: messages[conversationId ?? ''] ?? [] }
}
