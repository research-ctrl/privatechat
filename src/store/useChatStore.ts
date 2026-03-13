import { create } from 'zustand'
import type { ConversationWithParticipants, DecryptedMessage } from '@/types'

interface ChatStore {
  conversations: ConversationWithParticipants[]
  activeConversationId: string | null
  messages: Record<string, DecryptedMessage[]>
  typingUsers: Record<string, string[]> // conversationId -> userIds typing

  setConversations: (conversations: ConversationWithParticipants[]) => void
  setActiveConversation: (id: string | null) => void
  addMessage: (conversationId: string, message: DecryptedMessage) => void
  setMessages: (conversationId: string, messages: DecryptedMessage[]) => void
  setTypingUsers: (conversationId: string, userIds: string[]) => void
  updateConversationLastMessage: (conversationId: string, preview: string, at: string) => void
  reset: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messages[conversationId] ?? []
      // Avoid duplicates
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

  updateConversationLastMessage: (conversationId, preview, at) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessagePreview: preview, lastMessageAt: at, updated_at: at }
          : c
      ),
    })),

  reset: () => set({ conversations: [], activeConversationId: null, messages: {}, typingUsers: {} }),
}))
