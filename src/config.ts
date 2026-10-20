// 讀取 VITE_ 開頭的設定值。沒設定就用 mock（階段一）。

export type Backend = 'mock' | 'supabase'

export const config = {
  backend: (import.meta.env.VITE_BACKEND || 'mock') as Backend,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
}
