import { useState, useCallback, useRef } from 'react'
import { Search, X, AlertCircle, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useUserSearch } from '@/hooks/useUserSearch'
import { useChatStore } from '@/store/useChatStore'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'
import type { Profile, ConversationWithParticipants } from '@/types'

interface UserSearchProps {
  refetch: () => Promise<void>
}

export function UserSearch({ refetch }: UserSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [openingUserId, setOpeningUserId] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)
  const { results, isSearching, search, clear } = useUserSearch()
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleInput = (value: string) => {
    setQuery(value)
    setOpenError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  const handleClose = () => {
    setQuery('')
    clear()
    setIsOpen(false)
    setOpenError(null)
  }

  const handleSelectUser = useCallback(async (user: Profile) => {
    setOpeningUserId(user.id)
    setOpenError(null)
    try {
      // Step 1: Get or create the conversation in DB
      const { data: conversationId, error } = await supabase.rpc('get_or_create_conversation', {
        other_user_id: user.id,
      })
      if (error) throw new Error(`Could not open chat: ${error.message}`)
      if (!conversationId) throw new Error('No conversation ID returned from server')

      const id = conversationId as string

      // Step 2: Inject conversation into store immediately from known data so
      // ChatWindow renders instantly without waiting for a DB refetch.
      const existingConvs = useChatStore.getState().conversations
      const alreadyInStore = existingConvs.some((c) => c.id === id)

      if (!alreadyInStore) {
        const currentProfile = useAuthStore.getState().profile
        if (currentProfile) {
          const newConv: ConversationWithParticipants = {
            id,
            is_group: false,
            name: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            participants: [currentProfile, user],
            otherUser: user,
          }
          useChatStore.getState().setConversations([newConv, ...existingConvs])
        }
      }

      // Step 3: Activate — ChatWindow renders now
      setActiveConversation(id)
      handleClose()

      // Step 4: Background refresh to sync any latest DB state
      void refetch()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to open chat'
      console.error('handleSelectUser failed:', err)
      setOpenError(msg)
    } finally {
      setOpeningUserId(null)
    }
  }, [refetch, setActiveConversation])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-sm transition-colors"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span>Search users...</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Search by username..."
            className="pl-9 pr-4"
          />
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {openError && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{openError}</span>
        </div>
      )}

      {(results.length > 0 || isSearching) && (
        <div className="bg-background border rounded-lg shadow-md overflow-hidden max-h-48 overflow-y-auto">
          {isSearching && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
          )}
          {results.map((user) => {
            const isOpening = openingUserId === user.id
            return (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                disabled={isOpening}
                className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted text-left transition-colors disabled:opacity-60"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {getInitials(user.display_name ?? user.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{user.username}</p>
                  {user.display_name && user.display_name !== user.username && (
                    <p className="text-xs text-muted-foreground">{user.display_name}</p>
                  )}
                </div>
                {isOpening && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
              </button>
            )
          })}
          {!isSearching && query.length >= 2 && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No users found</div>
          )}
        </div>
      )}
    </div>
  )
}
