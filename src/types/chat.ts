export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  public_key: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  ciphertext: string
  iv: string
  message_type: 'text' | 'image'
  is_deleted: boolean
  created_at: string
}

export interface DecryptedMessage {
  id: string
  conversation_id: string
  sender_id: string
  message_type: 'text' | 'image'
  is_deleted: boolean
  created_at: string
  content: string
  sender: Profile
  isDecrypting?: boolean
  isOwn?: boolean
}

export interface Conversation {
  id: string
  is_group: boolean
  name: string | null
  created_at: string
  updated_at: string
}

export interface ConversationWithParticipants extends Conversation {
  participants: Profile[]
  otherUser: Profile
  lastMessagePreview?: string
  lastMessageAt?: string
  unreadCount?: number
}

export interface TypingIndicator {
  conversation_id: string
  user_id: string
  updated_at: string
}
