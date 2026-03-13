import { create } from 'zustand'
import { supabase, toAuthEmail } from '@/lib/supabase'
import {
  generateKeyPair,
  exportPublicKeyAsJWK,
  encryptPrivateKey,
  decryptPrivateKey,
  saveEncryptedKeyToSession,
  getEncryptedKeyFromSession,
  clearSessionKeys,
} from '@/lib/crypto'
import { useKeyStore } from './useKeyStore'
import { useChatStore } from './useChatStore'
import type { Profile } from '@/types'

interface AuthStore {
  userId: string | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  signUp: (username: string, password: string) => Promise<void>
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  userId: null,
  profile: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  clearError: () => set({ error: null }),

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      set({ isInitialized: true })
      return
    }

    // Try to restore private key from sessionStorage
    const savedKeys = getEncryptedKeyFromSession()
    if (savedKeys) {
      // We need to re-derive the key but we don't have the password
      // We stored it in session, so we can re-load it next sign-in
      // For now, just set userId and load profile — key will be re-derived on next action
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    set({ userId: session.user.id, profile, isInitialized: true })
  },

  signUp: async (username, password) => {
    set({ isLoading: true, error: null })
    try {
      // Validate username format
      if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        throw new Error('Username must be 3-30 characters: lowercase letters, numbers, underscores only')
      }

      // Generate ECDH key pair
      const keyPair = await generateKeyPair()
      const publicKeyJwk = await exportPublicKeyAsJWK(keyPair.publicKey)
      const { encryptedKey, salt, iv } = await encryptPrivateKey(keyPair.privateKey, password)

      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: toAuthEmail(username),
        password,
        options: {
          data: {
            username: username.toLowerCase(),
            public_key: publicKeyJwk,
          },
        },
      })

      if (error) throw new Error(error.message)
      if (!data.user) throw new Error('Signup failed — no user returned')

      // Store encrypted private key
      const { error: keyError } = await supabase.from('user_keys').insert({
        user_id: data.user.id,
        encrypted_private_key: encryptedKey,
        key_salt: salt,
        key_iv: iv,
      })

      if (keyError) throw new Error(`Failed to store key: ${keyError.message}`)

      // Cache private key in memory
      useKeyStore.getState().setPrivateKey(keyPair.privateKey)
      saveEncryptedKeyToSession(encryptedKey, salt, iv)

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      set({ userId: data.user.id, profile, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  signIn: async (username, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: toAuthEmail(username),
        password,
      })

      if (error) throw new Error(error.message)
      if (!data.user) throw new Error('Sign in failed')

      // Fetch user's encrypted private key
      const { data: keyData, error: keyError } = await supabase
        .from('user_keys')
        .select('*')
        .eq('user_id', data.user.id)
        .single()

      if (keyError || !keyData) throw new Error('Could not retrieve encryption keys')

      // Decrypt private key using password
      const privateKey = await decryptPrivateKey(
        keyData.encrypted_private_key,
        keyData.key_salt,
        keyData.key_iv,
        password
      )

      useKeyStore.getState().setPrivateKey(privateKey)
      saveEncryptedKeyToSession(keyData.encrypted_private_key, keyData.key_salt, keyData.key_iv)

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      set({ userId: data.user.id, profile, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed'
      // Map Supabase errors to user-friendly messages
      const friendlyMessage = message.includes('Invalid login credentials')
        ? 'Invalid username or password'
        : message
      set({ error: friendlyMessage, isLoading: false })
      throw err
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    useKeyStore.getState().clearKeys()
    useChatStore.getState().reset()
    clearSessionKeys()
    set({ userId: null, profile: null, error: null })
  },
}))

// Keep auth state in sync with Supabase session changes
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    useAuthStore.getState().signOut()
  }
})
