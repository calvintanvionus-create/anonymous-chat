import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { JoinFailure, JoinResult } from '../../types'
import { LIMITS, countChars, truncateChars, validateNickname } from '../../lib/validate'
import { PixelHeart, PixelSakura } from '../Icons'

const JOIN_ERRORS: Record<JoinFailure, string> = {
  nickname_taken: '這個代號已有人使用，請換一個',
  nickname_invalid: '代號格式不正確，請換一個',
  connection_failed: '無法連線，請稍後再試',
}

export function JoinPage({ onJoin }: { onJoin: (nickname: string) => Promise<JoinResult> }) {
  const inputId = useId()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const check = validateNickname(value)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!check.ok) {
      setError(check.message)
      return
    }
    setBusy(true)
    setError(null)
    const result = await onJoin(value)
    setBusy(false)
    if (!result.ok) setError(JOIN_ERRORS[result.reason])
  }

  return (
    <main className="join">
      <PixelSakura size={30} className="deco" style={{ left: 24, top: 40 }} />
      <PixelSakura size={20} className="deco" style={{ right: 30, top: 96 }} />
      <span className="deco deco-star" style={{ right: 34, top: 40, fontSize: 22 }} aria-hidden="true">★</span>
      <span className="deco deco-heart" style={{ left: 40, bottom: 90, fontSize: 20 }} aria-hidden="true">♥</span>
      <span className="deco deco-mint" style={{ right: 50, bottom: 70, fontSize: 18 }} aria-hidden="true">☆</span>

      <div className="join-inner">
        <div className="box pk big">
          <PixelHeart className="big-heart" />
          <h1>像素聊天室</h1>
          <p>不用登入，取個代號就能進來聊天</p>
        </div>

        <form className="box form" onSubmit={submit} noValidate>
          <label className="lbl" htmlFor={inputId}>★ 你的代號</label>
          <input
            id={inputId}
            className="field"
            type="text"
            value={value}
            placeholder="例如：小明"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-err` : undefined}
            onChange={(event) => {
              setValue(truncateChars(event.target.value, LIMITS.nicknameMax))
              setError(null)
            }}
          />
          <div className="cnt">{countChars(value)} / {LIMITS.nicknameMax}</div>
          {error && (
            <div className="err" id={`${inputId}-err`} role="alert">{error}</div>
          )}
          <button className="btn" type="submit" disabled={!check.ok || busy}>
            {busy ? '連線中…' : '進入聊天室 ▶'}
          </button>
        </form>

        <p className="hint join-hint">1～20 個字，對方離線後代號就能再使用</p>
      </div>
    </main>
  )
}
