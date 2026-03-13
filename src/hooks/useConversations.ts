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

    try {
      // Get all conversation IDs the user is in
      const { data: participantRows, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId)

      if (participantError) {
        console.error('Failed to fetch conversation participants:', participantError)
        setConversations([])
        return
      }

      if (!participantRows || participantRows.length === 0) {
        setConversations([])
        return
      }

      const convIds = participantRows.map((r) => r.conversation_id)

      // Get full conversation data
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', convIds)
        .order('updated_at', { ascending: false })

      if (convError) {
        console.error('Failed to fetch conversations:', convError)
        return
      }

      if (!convData) {
        setConversations([])
        return
      }

      // Get all participants for these conversations
      const { data: allParticipants, error: allParticipantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', convIds)

      if (allParticipantsError) {
        console.error('Failed to fetch all participants:', allParticipantsError)
        return
      }

      if (!allParticipants) {
        setConversations([])
        return
      }

      // Get profiles for all participants
      const allUserIds = [...new Set(allParticipants.map((p) => p.user_id))]
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', allUserIds)

      if (profilesError) {
        console.error('Failed to fetch profiles:', profilesError)
        return
      }

      if (!profiles) {
        setConversations([])
        return
      }

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
    } catch (err) {
      console.error('useConversations error:', err)
      setConversations([])
    }
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
