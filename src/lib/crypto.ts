import { bufferToBase64, base64ToBuffer } from './utils'

// ─── Key Generation ────────────────────────────────────────────────────────────

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )
}

export async function exportPublicKeyAsJWK(publicKey: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', publicKey)
  return JSON.stringify(jwk)
}

export async function importPublicKeyFromJWK(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString) as JsonWebKey
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  )
}

// ─── Private Key Wrapping with Password (PBKDF2 + AES-GCM) ───────────────────

export async function encryptPrivateKey(
  privateKey: CryptoKey,
  password: string
): Promise<{ encryptedKey: string; salt: string; iv: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(32))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const wrappingKey = await deriveWrappingKey(password, salt)

  const privateKeyJwk = await crypto.subtle.exportKey('jwk', privateKey)
  const privateKeyBytes = new TextEncoder().encode(JSON.stringify(privateKeyJwk))

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    privateKeyBytes
  )

  return {
    encryptedKey: bufferToBase64(encryptedBuffer),
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
  }
}

export async function decryptPrivateKey(
  encryptedKey: string,
  salt: string,
  iv: string,
  password: string
): Promise<CryptoKey> {
  const saltBuffer = base64ToBuffer(salt)
  const ivBuffer = base64ToBuffer(iv)
  const encryptedBuffer = base64ToBuffer(encryptedKey)

  const wrappingKey = await deriveWrappingKey(password, new Uint8Array(saltBuffer))

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    wrappingKey,
    encryptedBuffer
  )

  const privateKeyJwk = JSON.parse(new TextDecoder().decode(decryptedBuffer)) as JsonWebKey
  return crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )
}

async function deriveWrappingKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 310000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// ─── Session Key Storage (sessionStorage for refresh persistence) ─────────────

const SESSION_KEY_ID = 'privatechat-wrapping-key-salt'
const SESSION_IV_ID = 'privatechat-wrapping-key-iv'
const SESSION_ENC_KEY = 'privatechat-encrypted-pkey'

export function saveEncryptedKeyToSession(encryptedKey: string, salt: string, iv: string) {
  sessionStorage.setItem(SESSION_ENC_KEY, encryptedKey)
  sessionStorage.setItem(SESSION_KEY_ID, salt)
  sessionStorage.setItem(SESSION_IV_ID, iv)
}

export function getEncryptedKeyFromSession(): { encryptedKey: string; salt: string; iv: string } | null {
  const encryptedKey = sessionStorage.getItem(SESSION_ENC_KEY)
  const salt = sessionStorage.getItem(SESSION_KEY_ID)
  const iv = sessionStorage.getItem(SESSION_IV_ID)
  if (!encryptedKey || !salt || !iv) return null
  return { encryptedKey, salt, iv }
}

export function clearSessionKeys() {
  sessionStorage.removeItem(SESSION_ENC_KEY)
  sessionStorage.removeItem(SESSION_KEY_ID)
  sessionStorage.removeItem(SESSION_IV_ID)
}

// ─── ECDH Shared Key Derivation ───────────────────────────────────────────────

export async function deriveSharedAESKey(
  myPrivateKey: CryptoKey,
  theirPublicKeyJWK: string
): Promise<CryptoKey> {
  const theirPublicKey = await importPublicKeyFromJWK(theirPublicKeyJWK)

  // ECDH → raw bits
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: theirPublicKey },
    myPrivateKey,
    256
  )

  // Import raw bits as HKDF key material
  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey'])

  // HKDF → AES-GCM 256-bit key
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32).buffer as ArrayBuffer,
      info: new TextEncoder().encode('privatechat-v1'),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// ─── Message Encryption / Decryption ─────────────────────────────────────────

export async function encryptMessage(
  plaintext: string,
  sharedKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintextBytes = new TextEncoder().encode(plaintext)

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    plaintextBytes
  )

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv.buffer),
  }
}

export async function decryptMessage(
  ciphertext: string,
  iv: string,
  sharedKey: CryptoKey
): Promise<string> {
  const ciphertextBuffer = base64ToBuffer(ciphertext)
  const ivBuffer = base64ToBuffer(iv)

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    sharedKey,
    ciphertextBuffer
  )

  return new TextDecoder().decode(plaintextBuffer)
}

// ─── Image Encryption ─────────────────────────────────────────────────────────

export async function encryptImageBytes(
  imageBuffer: ArrayBuffer
): Promise<{ encryptedData: ArrayBuffer; key: CryptoKey; iv: Uint8Array }> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, imageBuffer)
  return { encryptedData, key, iv }
}

export async function decryptImageBytes(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  iv: ArrayBuffer
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedData)
}

export async function exportAESKeyAsJWK(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key)
  return JSON.stringify(jwk)
}

export async function importAESKeyFromJWK(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString) as JsonWebKey
  return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
}
