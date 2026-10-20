// 代號、訊息、圖片的檢查規則。
// 前端檢查只是提醒使用者；階段二時，同樣的規則會在資料庫再強制一次。

export const LIMITS = {
  nicknameMax: 20,
  messageMax: 500,
  imageMaxBytes: 5 * 1024 * 1024,
  /** 新進來的人看到的歷史訊息數量 */
  historyCount: 50,
  /** 資料庫保留的訊息數量（階段二由資料庫強制） */
  retainCount: 200,
  /** 同一個人送訊息的最短間隔 */
  rateLimitMs: 1000,
  /** 對方停止打字多久後，「正在輸入」自動消失 */
  typingIdleMs: 3000,
} as const

/** 用「字」計算長度（emoji 算 1 個字，而不是 2 個） */
export function countChars(text: string): number {
  return Array.from(text).length
}

export function truncateChars(text: string, max: number): string {
  const chars = Array.from(text)
  return chars.length <= max ? text : chars.slice(0, max).join('')
}

const RESERVED_NICKNAMES = ['系統', '系统', 'system', 'admin', 'administrator', '管理員', '管理员', 'moderator']

export type NicknameCheck = { ok: true; value: string } | { ok: false; message: string }

export function validateNickname(raw: string): NicknameCheck {
  const value = raw.trim()
  if (!value) return { ok: false, message: '請輸入代號' }
  if (countChars(value) > LIMITS.nicknameMax) {
    return { ok: false, message: `代號最多 ${LIMITS.nicknameMax} 個字` }
  }
  if (/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(value)) {
    return { ok: false, message: '代號不能包含看不見的特殊字元' }
  }
  if (RESERVED_NICKNAMES.includes(value.toLowerCase())) {
    return { ok: false, message: '這個代號是保留字，請換一個' }
  }
  return { ok: true, value }
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const

/** 看檔案開頭的幾個位元組判斷真正的格式，不只信副檔名 */
export async function sniffImageType(file: Blob): Promise<string | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const startsWith = (...sig: number[]) => sig.every((b, i) => bytes[i] === b)
  if (startsWith(0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return 'image/png'
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return 'image/gif'
  if (startsWith(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp'
  }
  return null
}

export type ImageCheck = { ok: true } | { ok: false; reason: 'image_type' | 'image_too_large' }

export async function checkImage(file: File): Promise<ImageCheck> {
  const real = await sniffImageType(file)
  if (!real) return { ok: false, reason: 'image_type' }
  if (file.size > LIMITS.imageMaxBytes) return { ok: false, reason: 'image_too_large' }
  return { ok: true }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
