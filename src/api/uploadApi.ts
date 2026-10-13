import { upload } from '@vercel/blob/client'
import { API_BASE_URL } from './flowApi'

export async function uploadAttachment(file: File): Promise<string> {
  const result = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: `${API_BASE_URL}/api/upload`,
  })
  return result.url
}
