// 第 5 章「通訊約定」的資料格式。畫面與服務（假資料／Supabase）都只認這些型別。

export interface Message {
  /** 訊息編號，用來排序與去重 */
  id: number
  nickname: string
  body: string
  /** 圖片路徑；沒有圖片是 null。要顯示時用 ChatService.imageUrl() 轉成網址 */
  imagePath: string | null
  /** ISO 8601，伺服器收到的時間 */
  createdAt: string
}

export interface Member {
  nickname: string
  joinedAt: string
}

/** 只存在畫面上，不存資料庫 */
export interface SystemNotice {
  kind: 'join' | 'leave'
  nickname: string
  at: string
}

export type ConnectionStatus = 'connecting' | 'online' | 'reconnecting' | 'offline'

export type JoinFailure = 'nickname_taken' | 'nickname_invalid' | 'connection_failed'
export type JoinResult = { ok: true } | { ok: false; reason: JoinFailure }

export type SendFailure =
  | 'too_long'
  | 'rate_limited'
  | 'image_type'
  | 'image_too_large'
  | 'offline'
  | 'empty'
  | 'not_joined'
  | 'failed'
export type SendResult = { ok: true } | { ok: false; reason: SendFailure }

/** 服務 → 畫面 的事件名稱，與帶的資料 */
export interface ChatEvents {
  'history:loaded': Message[]
  'message:new': Message
  'presence:sync': Member[]
  'presence:join': Member
  'presence:leave': Member
  /** 正在輸入的代號（已排除自己） */
  'typing:update': string[]
  'connection:status': ConnectionStatus
}
