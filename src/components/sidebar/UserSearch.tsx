import { useState, useCallback, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useUserSearch } from '@/hooks/useUserSearch'
import { useChatStore } from '@/store/useChatStore'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types'

interface UserSearchProps {
  refetch: () => Promise<void>
}

export function UserSearch({ refetch }: UserSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const { results, isSearching, search, clear } = useUserSearch()
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleInput = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  const handleClose = () => {
    setQuery('')
    clear()
    setIsOpen(false)
  }

  const handleSelectUser = useCallback(async (user: Profile) => {
    try {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        other_user_id: user.id,
      })
      if (error) throw error
      await refetch()
      setActiveConversation(data as string)
      handleClose()
    } catch (err) {
      console.error('Failed to open conversation:', err)
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

      {(results.length > 0 || isSearching) && (
        <div className="bg-background border rounded-lg shadow-md overflow-hidden max-h-48 overflow-y-auto">
          {isSearching && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
          )}
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted text-left transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {getInitials(user.display_name ?? user.username)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{user.username}</p>
                {user.display_name && user.display_name !== user.username && (
                  <p className="text-xs text-muted-foreground">{user.display_name}</p>
                )}
              </div>
            </button>
          ))}
          {!isSearching && query.length >= 2 && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No users found</div>
          )}
        </div>
      )}
    </div>
  )
}
