import { useEffect, useState } from 'react'

/** 跟著手機／電腦的系統設定切換夜晚版。不提供手動切換（架構文件第 10 章） */
export function useSystemNight(): boolean {
  const query = '(prefers-color-scheme: dark)'
  const [night, setNight] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setNight(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = night ? 'night' : 'day'
  }, [night])

  return night
}

/** 電腦（有滑鼠）：Enter 送出；手機：Enter 換行 */
export function useIsDesktopKeyboard(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
