import { supabase } from './supabase'
import {
  encryptImageBytes,
  decryptImageBytes,
  exportAESKeyAsJWK,
  importAESKeyFromJWK,
  encryptMessage,
  decryptMessage,
} from './crypto'
import { bufferToBase64, base64ToBuffer } from './utils'

const BUCKET = 'chat-images'

export interface ImageMessagePayload {
  path: string
  keyJwk: string
  iv: string
  mimeType: string
}

export async function encryptAndUploadImage(
  file: File,
  userId: string,
  sharedKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const imageBuffer = await file.arrayBuffer()
  const { encryptedData, key, iv } = await encryptImageBytes(imageBuffer)

  const fileName = `${userId}/${crypto.randomUUID()}.enc`
  const blob = new Blob([encryptedData], { type: 'application/octet-stream' })

  const { error } = await supabase.storage.from(BUCKET).upload(fileName, blob, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) throw new Error(`Image upload failed: ${error.message}`)

  const keyJwk = await exportAESKeyAsJWK(key)
  const payload: ImageMessagePayload = {
    path: fileName,
    keyJwk,
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    mimeType: file.type || 'image/jpeg',
  }

  return encryptMessage(JSON.stringify(payload), sharedKey)
}

export async function downloadAndDecryptImage(
  ciphertext: string,
  iv: string,
  sharedKey: CryptoKey
): Promise<string> {
  const payloadJson = await decryptMessage(ciphertext, iv, sharedKey)
  const payload = JSON.parse(payloadJson) as ImageMessagePayload

  const { data: signedData, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(payload.path, 300)

  if (signError || !signedData) throw new Error('Failed to get signed URL')

  const response = await fetch(signedData.signedUrl)
  if (!response.ok) throw new Error('Failed to download image')

  const encryptedBuffer = await response.arrayBuffer()
  const key = await importAESKeyFromJWK(payload.keyJwk)
  const ivBuffer = base64ToBuffer(payload.iv)

  const decryptedBuffer = await decryptImageBytes(encryptedBuffer, key, ivBuffer)
  const blob = new Blob([decryptedBuffer], { type: payload.mimeType })
  return URL.createObjectURL(blob)
}
