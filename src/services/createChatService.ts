import { config } from '../config'
import type { ChatService } from './ChatService'
import { MockChatService } from './MockChatService'

/** 依 VITE_BACKEND 決定用哪一個服務。階段二在這裡加上 SupabaseChatService。 */
export function createChatService(): ChatService {
  if (config.backend === 'supabase') {
    throw new Error('Supabase 版本要到階段二才會接上。請先把 VITE_BACKEND 設成 mock，或不要設定。')
  }
  return new MockChatService()
}
