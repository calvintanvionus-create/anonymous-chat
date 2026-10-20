// 時間一律用使用者自己裝置的時區顯示。

const pad = (n: number) => String(n).padStart(2, '0')

/** 14:32 */
export function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 用來判斷兩則訊息是不是同一天 */
export function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** 2026 年 10 月 20 日 */
export function formatDay(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}
