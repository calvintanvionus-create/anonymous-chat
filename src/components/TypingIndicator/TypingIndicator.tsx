const MAX_NAMES = 3

export function typingLabel(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length > MAX_NAMES) return '多人正在輸入'
  return `${names.join('、')} 正在輸入`
}

/** 輸入框上方的「正在輸入」。沒人輸入時也保留高度，版面才不會跳動 */
export function TypingIndicator({ names }: { names: string[] }) {
  return (
    <div className="typing" aria-live="polite">
      {names.length > 0 && (
        <>
          <span>{typingLabel(names)}</span>
          <span className="dots" aria-hidden="true"><i /><i /><i /></span>
        </>
      )}
    </div>
  )
}
