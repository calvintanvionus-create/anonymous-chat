import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react'
import type { SendFailure, SendResult } from '../../types'
import { ALLOWED_IMAGE_TYPES, LIMITS, checkImage, countChars, formatBytes, truncateChars } from '../../lib/validate'
import { useIsDesktopKeyboard } from '../../hooks/useSystemTheme'
import { EmojiPicker } from '../EmojiPicker/EmojiPicker'
import { PictureIcon, SmileIcon } from '../Icons'

const SEND_ERRORS: Record<SendFailure, string> = {
  too_long: `訊息太長了，最多 ${LIMITS.messageMax} 字`,
  rate_limited: '送太快了，請稍等一下',
  image_type: '只能傳 JPG、PNG、GIF、WebP 圖片',
  image_too_large: '圖片太大了，請選 5 MB 以內的圖片',
  offline: '連線中斷，暫時不能送出',
  empty: '',
  not_joined: '還沒進入聊天室',
  failed: '送出失敗，請再試一次',
}

interface PickedImage {
  file: File
  url: string
}

interface Props {
  /** 斷線時整個輸入區停用 */
  disabled: boolean
  onSend: (input: { body: string; image?: File | null }) => Promise<SendResult>
  /** 通知其他人「正在輸入／停止輸入」 */
  onTyping: (isTyping: boolean) => void
}

export function MessageInput({ disabled, onSend, onTyping }: Props) {
  const [text, setText] = useState('')
  const [image, setImage] = useState<PickedImage | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [cooling, setCooling] = useState(false)

  const areaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const emojiRef = useRef<HTMLElement>(null)
  const emojiToggleRef = useRef<HTMLButtonElement>(null)
  const lastTypingSent = useRef(0)
  const idleTimer = useRef<number | undefined>(undefined)
  const coolTimer = useRef<number | undefined>(undefined)
  const imageRef = useRef<PickedImage | null>(null)
  imageRef.current = image

  const desktopKeyboard = useIsDesktopKeyboard()
  const count = countChars(text)
  const nearLimit = count >= LIMITS.messageMax - 50
  const canSend = !disabled && !cooling && (text.trim().length > 0 || image !== null)

  // ── 正在輸入：開始打字時通知一次，之後每 2 秒最多再通知一次；停下來 3 秒自動取消 ──
  function stopTyping() {
    window.clearTimeout(idleTimer.current)
    if (lastTypingSent.current) {
      lastTypingSent.current = 0
      onTyping(false)
    }
  }

  function touchTyping(next: string) {
    if (!next.trim()) {
      stopTyping()
      return
    }
    const now = Date.now()
    if (now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now
      onTyping(true)
    }
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(stopTyping, LIMITS.typingIdleMs)
  }

  useEffect(
    () => () => {
      window.clearTimeout(idleTimer.current)
      window.clearTimeout(coolTimer.current)
      if (imageRef.current) URL.revokeObjectURL(imageRef.current.url)
    },
    // 只在離開畫面時清理
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // 斷線時不要留著「正在輸入」
  useEffect(() => {
    if (disabled) stopTyping()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled])

  // 輸入框隨內容長高（最多約 4 行）
  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [text])

  // emoji 面板：點外面或按 Esc 關閉
  useEffect(() => {
    if (!emojiOpen) return
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (emojiRef.current?.contains(target) || emojiToggleRef.current?.contains(target)) return
      setEmojiOpen(false)
    }
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setEmojiOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [emojiOpen])

  function addError(message: string) {
    if (message) setErrors((list) => (list.includes(message) ? list : [...list, message]))
  }

  function changeText(next: string) {
    const limited = truncateChars(next, LIMITS.messageMax)
    setText(limited)
    setErrors([])
    touchTyping(limited)
  }

  function insertEmoji(emoji: string) {
    const el = areaRef.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? start
    changeText(text.slice(0, start) + emoji + text.slice(end))
    const caret = start + emoji.length
    requestAnimationFrame(() => el?.setSelectionRange(caret, caret))
  }

  function clearImage() {
    setImage((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return null
    })
  }

  async function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // 同一張圖可以再選一次
    if (!file) return
    const result = await checkImage(file)
    if (!result.ok) {
      setErrors([SEND_ERRORS[result.reason]])
      return
    }
    setErrors([])
    setImage((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return { file, url: URL.createObjectURL(file) }
    })
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!canSend) return
    setErrors([])
    setCooling(true)
    window.clearTimeout(coolTimer.current)
    coolTimer.current = window.setTimeout(() => setCooling(false), LIMITS.rateLimitMs)

    const result = await onSend({ body: text, image: image?.file ?? null })
    if (result.ok) {
      setText('')
      clearImage()
      setEmojiOpen(false)
      stopTyping()
    } else {
      addError(SEND_ERRORS[result.reason])
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // 電腦：Enter 送出、Shift+Enter 換行。注音／拼音選字中的 Enter 不算送出
    if (event.key === 'Enter' && !event.shiftKey && desktopKeyboard && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <>
      {emojiOpen && <EmojiPicker ref={emojiRef} onPick={insertEmoji} />}

      <form className="box comp" onSubmit={submit}>
        {errors.map((message) => (
          <div className="err" role="alert" key={message}>{message}</div>
        ))}

        {image && (
          <div className="prev">
            <img className="thumb" src={image.url} alt="準備傳送的圖片預覽" />
            <div className="info">
              <div className="info-name">{image.file.name}</div>
              <span>{formatBytes(image.file.size)} · 送出前可取消</span>
            </div>
            <button className="btn plain sm" type="button" onClick={clearImage}>取消 ✕</button>
          </div>
        )}

        <div className="crow">
          <button
            ref={emojiToggleRef}
            className={`btn${emojiOpen ? '' : ' plain'}`}
            type="button"
            disabled={disabled}
            aria-label={emojiOpen ? '關閉 emoji 面板' : '開啟 emoji 面板'}
            aria-pressed={emojiOpen}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setEmojiOpen((open) => !open)}
          >
            <SmileIcon />
          </button>
          <button
            className="btn plain"
            type="button"
            disabled={disabled}
            aria-label="選擇圖片"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            <PictureIcon />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            hidden
            onChange={pickImage}
          />
          <textarea
            ref={areaRef}
            className="field msg-field"
            rows={1}
            value={text}
            disabled={disabled}
            aria-label="輸入訊息"
            placeholder={disabled ? '連線中斷，暫時不能送出' : '說點什麼吧…'}
            enterKeyHint={desktopKeyboard ? 'send' : 'enter'}
            onChange={(event) => changeText(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <button className="btn" type="submit" disabled={!canSend} onMouseDown={(event) => event.preventDefault()}>
            送出
          </button>
        </div>
        <div className={`cnt${nearLimit ? ' warn' : ''}`} aria-live="polite">
          {nearLimit ? `還能輸入 ${LIMITS.messageMax - count} 字` : `${count} / ${LIMITS.messageMax}`}
          {desktopKeyboard && count === 0 ? '　Enter 送出，Shift+Enter 換行' : ''}
        </div>
      </form>
    </>
  )
}
