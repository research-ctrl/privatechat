import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useChatStore } from '@/store/useChatStore'
import type { ConversationWithParticipants, Profile } from '@/types'

export function useConversations() {
  const userId = useAuthStore((s) => s.userId)
  const { conversations, setConversations } = useChatStore()

  const fetchConversations = useCallback(async () => {
    if (!userId) return

    // Get all conversation IDs the user is in
    const { data: participantRows } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)

    if (!participantRows || participantRows.length === 0) {
      setConversations([])
      return
    }

    const convIds = participantRows.map((r) => r.conversation_id)

    // Get full conversation data
    const { data: convData } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convIds)
      .order('updated_at', { ascending: false })

    if (!convData) return

    // Get all participants for these conversations
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', convIds)

    if (!allParticipants) return

    // Get profiles for all participants
    const allUserIds = [...new Set(allParticipants.map((p) => p.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', allUserIds)

    if (!profiles) return

    const profileMap = new Map<string, Profile>(profiles.map((p) => [p.id, p as Profile]))

    const enriched: ConversationWithParticipants[] = convData.map((conv) => {
      const convParticipants = allParticipants
        .filter((p) => p.conversation_id === conv.id)
        .map((p) => profileMap.get(p.user_id))
        .filter(Boolean) as Profile[]

      const otherUser = convParticipants.find((p) => p.id !== userId) ?? convParticipants[0]

      return {
        ...conv,
        participants: convParticipants,
        otherUser,
        lastMessagePreview: '[Encrypted]',
        lastMessageAt: conv.updated_at,
      } as ConversationWithParticipants
    })

    setConversations(enriched)
  }, [userId, setConversations])

  useEffect(() => {
    fetchConversations()

    if (!userId) return

    // Subscribe to new participants (someone starts a chat with you)
    const channel = supabase
      .channel(`conversations:${userId}`)
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

    return () => { void supabase.removeChannel(channel) }
  }, [userId, fetchConversations])

  return { conversations, refetch: fetchConversations }
}
