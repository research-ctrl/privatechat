import { create } from 'zustand'
import type { ConversationWithParticipants, DecryptedMessage } from '@/types'

interface ChatStore {
  conversations: ConversationWithParticipants[]
  activeConversationId: string | null
  messages: Record<string, DecryptedMessage[]>
  typingUsers: Record<string, string[]>
  unreadCounts: Record<string, number>

  setConversations: (conversations: ConversationWithParticipants[]) => void
  setActiveConversation: (id: string | null) => void
  addMessage: (conversationId: string, message: DecryptedMessage) => void
  setMessages: (conversationId: string, messages: DecryptedMessage[]) => void
  setTypingUsers: (conversationId: string, userIds: string[]) => void
  updateConversationLastMessage: (conversationId: string, preview: string, at: string) => void
  incrementUnread: (conversationId: string) => void
  clearUnread: (conversationId: string) => void
  reset: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  unreadCounts: {},

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) =>
    set((state) => ({
      activeConversationId: id,
      // Clear unread immediately when activating a conversation
      unreadCounts: id
        ? { ...state.unreadCounts, [id]: 0 }
        : state.unreadCounts,
    })),

  addMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messages[conversationId] ?? []
      // Deduplicate by ID
      if (existing.some((m) => m.id === message.id)) return state
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...existing, message],
        },
      }
    }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  setTypingUsers: (conversationId, userIds) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [conversationId]: userIds },
    })),

  // Updates sidebar preview text + timestamp. Sorting is done in ConversationList with useMemo.
  updateConversationLastMessage: (conversationId, preview, at) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessagePreview: preview, lastMessageAt: at, updated_at: at }
          : c
      ),
    })),

  incrementUnread: (conversationId) =>
    set((state) => {
      // Never count unread for the currently visible conversation
      if (state.activeConversationId === conversationId) return state
      return {
        unreadCounts: {
          ...state.unreadCounts,
          [conversationId]: (state.unreadCounts[conversationId] ?? 0) + 1,
        },
      }
    }),

  clearUnread: (conversationId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [conversationId]: 0 },
    })),

  reset: () =>
    set({
      conversations: [],
      activeConversationId: null,
      messages: {},
      typingUsers: {},
      unreadCounts: {},
    }),
}))
