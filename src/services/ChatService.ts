import type { ChatEvents, JoinResult, SendResult } from '../types'

/**
 * 畫面和資料來源之間的「合約」（architecture.md 第 4、5 章）。
 *
 * 畫面只認這份功能清單，不知道背後是假資料（MockChatService）還是 Supabase。
 * 階段二只要新增一個遵守同樣合約的 SupabaseChatService，畫面程式不用動。
 */
export interface ChatService {
  /** 加入聊天室。成功後會依序收到 connection:status、history:loaded、presence:sync */
  join(nickname: string): Promise<JoinResult>

  /** 送出訊息。規則（長度、頻率、圖片）不符會回傳失敗原因 */
  sendMessage(input: { body: string; image?: File | null }): Promise<SendResult>

  /** 通知其他人「我正在輸入／停止輸入」。畫面端負責節流 */
  setTyping(isTyping: boolean): void

  /** 離開聊天室，代號立刻釋出 */
  leave(): void

  /** 訂閱事件，回傳取消訂閱的函式 */
  on<K extends keyof ChatEvents>(event: K, handler: (payload: ChatEvents[K]) => void): () => void

  /** 把訊息裡的 imagePath 轉成瀏覽器能顯示的網址 */
  imageUrl(path: string): string

  /** 只有假資料版本提供：用來在 ?debug=1 模式下測試斷線畫面 */
  debug?: {
    isOffline(): boolean
    setOffline(offline: boolean): void
  }
}
