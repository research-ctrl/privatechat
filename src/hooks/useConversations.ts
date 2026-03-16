import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useChatStore } from '@/store/useChatStore'
import type { ConversationWithParticipants, Profile } from '@/types'

interface RawMessage {
  conversation_id: string
  sender_id: string
  created_at: string
  message_type: string
}

export function useConversations() {
  const userId = useAuthStore((s) => s.userId)
  const conversations = useChatStore((s) => s.conversations)
  // Stable ref so fetchConversations never re-creates
  const userIdRef = useRef(userId)
  userIdRef.current = userId

  const fetchConversations = useCallback(async () => {
    const currentUserId = userIdRef.current
    if (!currentUserId) return

    try {
      // 1. Get all conversation IDs the user is part of
      const { data: participantRows, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId)

      if (participantError) {
        console.error('Failed to fetch conversation participants:', participantError)
        useChatStore.getState().setConversations([])
        return
      }

      if (!participantRows || participantRows.length === 0) {
        useChatStore.getState().setConversations([])
        return
      }

      const convIds = participantRows.map((r) => r.conversation_id)

      // 2. Fetch conversation rows ordered by most recent
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', convIds)
        .order('updated_at', { ascending: false })

      if (convError || !convData) {
        console.error('Failed to fetch conversations:', convError)
        return
      }

      // 3. Fetch all participant user IDs for those conversations
      const { data: allParticipants, error: allParticipantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', convIds)

      if (allParticipantsError || !allParticipants) {
        console.error('Failed to fetch all participants:', allParticipantsError)
        return
      }

      // 4. Batch-fetch all relevant profiles
      const allUserIds = [...new Set(allParticipants.map((p) => p.user_id))]
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', allUserIds)

      if (profilesError || !profiles) {
        console.error('Failed to fetch profiles:', profilesError)
        return
      }

      const profileMap = new Map<string, Profile>(profiles.map((p) => [p.id, p as Profile]))

      // 5. Preserve existing lastMessagePreview/lastMessageAt from store (don't overwrite with '[Encrypted]')
      const existingConvMap = new Map(
        useChatStore.getState().conversations.map((c) => [c.id, c])
      )

      const enriched: ConversationWithParticipants[] = convData.map((conv) => {
        const convParticipants = allParticipants
          .filter((p) => p.conversation_id === conv.id)
          .map((p) => profileMap.get(p.user_id))
          .filter(Boolean) as Profile[]

        const otherUser =
          convParticipants.find((p) => p.id !== currentUserId) ?? convParticipants[0]

        const existing = existingConvMap.get(conv.id)

        return {
          ...conv,
          participants: convParticipants,
          otherUser,
          // Preserve in-memory preview if it exists, otherwise show placeholder
          lastMessagePreview: existing?.lastMessagePreview ?? '🔒 Encrypted',
          lastMessageAt: existing?.lastMessageAt ?? conv.updated_at,
        } as ConversationWithParticipants
      })

      useChatStore.getState().setConversations(enriched)
    } catch (err) {
      console.error('useConversations error:', err)
    }
  }, []) // stable — reads userId via ref, store via getState()

  useEffect(() => {
    if (!userId) return

    fetchConversations()

    // ── Channel 1: New conversations (participant added) ──────────────────────
    const participantsChannel = supabase
      .channel(`participants:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`,
        },
        () => fetchConversations()
      )
      .subscribe()

    // ── Channel 2: Global message inserts ─────────────────────────────────────
    // Supabase RLS ensures only messages in the user's conversations arrive here.
    // This keeps the sidebar preview + unread badge updated even when a conversation
    // is not open (useMessages only runs for the active conversation).
    const messagesChannel = supabase
      .channel(`global-messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new as RawMessage
          const store = useChatStore.getState()

          // The active conversation's messages are handled (with decryption) by useMessages.
          // For non-active conversations, update the sidebar preview and unread count.
          if (store.activeConversationId !== msg.conversation_id) {
            const preview = msg.message_type === 'image' ? '📷 Photo' : '🔒 New message'
            store.updateConversationLastMessage(msg.conversation_id, preview, msg.created_at)

            // Only increment unread for messages from OTHER users
            const currentUserId = userIdRef.current
            if (msg.sender_id !== currentUserId) {
              store.incrementUnread(msg.conversation_id)
            }
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(participantsChannel)
      void supabase.removeChannel(messagesChannel)
    }
  }, [userId, fetchConversations])

  return { conversations, refetch: fetchConversations }
}
