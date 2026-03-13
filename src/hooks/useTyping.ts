import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useChatStore } from '@/store/useChatStore'

const TYPING_TIMEOUT = 3000

export function useTyping(conversationId: string | null) {
  const userId = useAuthStore((s) => s.userId)
  const setTypingUsers = useChatStore((s) => s.setTypingUsers)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTyping = useRef(false)

  const startTyping = useCallback(async () => {
    if (!conversationId || !userId) return
    try {
      if (!isTyping.current) {
        isTyping.current = true
        await supabase.from('typing_indicators').upsert({
          conversation_id: conversationId,
          user_id: userId,
          updated_at: new Date().toISOString(),
        })
      }

      if (typingTimer.current) clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(async () => {
        isTyping.current = false
        try {
          await supabase
            .from('typing_indicators')
            .delete()
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
        } catch { /* ignore cleanup errors */ }
      }, TYPING_TIMEOUT)
    } catch { /* ignore typing indicator errors — non-critical */ }
  }, [conversationId, userId])

  const stopTyping = useCallback(async () => {
    if (!conversationId || !userId) return
    try {
      if (typingTimer.current) clearTimeout(typingTimer.current)
      isTyping.current = false
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
    } catch { /* ignore cleanup errors */ }
  }, [conversationId, userId])

  useEffect(() => {
    if (!conversationId || !userId) return

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          try {
            const { data } = await supabase
              .from('typing_indicators')
              .select('user_id')
              .eq('conversation_id', conversationId)
              .neq('user_id', userId)

            setTypingUsers(conversationId, (data ?? []).map((r) => r.user_id))
          } catch { /* ignore */ }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
      if (typingTimer.current) clearTimeout(typingTimer.current)
    }
  }, [conversationId, userId, setTypingUsers])

  return { startTyping, stopTyping }
}
