import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import type { Profile } from '@/types'

export function useUserSearch() {
  const [results, setResults] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const userId = useAuthStore((s) => s.userId)

  const search = useCallback(
    async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setResults([])
        return
      }

      setIsSearching(true)
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', `%${query.toLowerCase()}%`)
          .neq('id', userId ?? '')
          .limit(8)

        setResults((data as Profile[]) ?? [])
      } finally {
        setIsSearching(false)
      }
    },
    [userId]
  )

  const clear = () => setResults([])

  return { results, isSearching, search, clear }
}
