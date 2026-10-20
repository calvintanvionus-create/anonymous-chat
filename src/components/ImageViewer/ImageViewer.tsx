import { useEffect, useRef } from 'react'

/** 圖片放大檢視：按「關閉」、點圖片或空白處、按 Esc 都能關閉 */
export function ImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      // 畫面上只有一個能操作的按鈕，焦點不要跑到背後的聊天室
      if (event.key === 'Tab') {
        event.preventDefault()
        closeRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [onClose])

  return (
    <div className="ov" role="dialog" aria-modal="true" aria-label="圖片放大檢視" onClick={onClose}>
      <img className="viewer-img" src={src} alt="放大的圖片" onClick={onClose} />
      <div className="hint">點圖片、點空白處或按 Esc 也能關閉</div>
      <button
        ref={closeRef}
        className="btn"
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onClose()
        }}
      >
        關閉 ✕
      </button>
    </div>
  )
}
