import { create } from 'zustand'
import { deriveSharedAESKey } from '@/lib/crypto'

interface KeyStore {
  privateKey: CryptoKey | null
  sharedKeys: Map<string, CryptoKey>
  setPrivateKey: (key: CryptoKey) => void
  getOrDeriveSharedKey: (theirUserId: string, theirPublicKeyJWK: string) => Promise<CryptoKey>
  clearKeys: () => void
}

export const useKeyStore = create<KeyStore>((set, get) => ({
  privateKey: null,
  sharedKeys: new Map(),

  setPrivateKey: (key) => set({ privateKey: key }),

  getOrDeriveSharedKey: async (theirUserId, theirPublicKeyJWK) => {
    const { privateKey, sharedKeys } = get()
    if (!privateKey) throw new Error('Private key not loaded')

    const cached = sharedKeys.get(theirUserId)
    if (cached) return cached

    const sharedKey = await deriveSharedAESKey(privateKey, theirPublicKeyJWK)
    const updated = new Map(sharedKeys)
    updated.set(theirUserId, sharedKey)
    set({ sharedKeys: updated })
    return sharedKey
  },

  clearKeys: () => set({ privateKey: null, sharedKeys: new Map() }),
}))
