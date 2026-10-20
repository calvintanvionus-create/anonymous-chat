import { forwardRef, useState } from 'react'

/** 把一串 emoji 拆成一個一個；❤ ☀ ❄ 預設是文字樣式，補上 U+FE0F 讓它顯示成 emoji */
function split(text: string): string[] {
  return (text.match(/\p{Extended_Pictographic}/gu) ?? []).map((e) =>
    /[❤☀❄]/.test(e) ? `${e}️` : e,
  )
}

const CATEGORIES: Array<{ name: string; emojis: string[] }> = [
  { name: '笑臉', emojis: split('😀😁😂🤣😊😍😘😎🥰😋🤔😴😭😡🥳😇🙃😉😅🤗😳🥺😱🤩') },
  { name: '動物', emojis: split('🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🐔🐧🐦🦆🦉🐴🦄🐝🦋') },
  { name: '食物', emojis: split('🍎🍊🍋🍌🍉🍇🍓🍑🍒🍕🍔🍟🌭🍿🍩🍪🎂🍰🍫🍬🍙🍜🍣☕') },
  { name: '符號', emojis: split('❤💕✨⭐🌸🔥👍👏🙌🙏💪👀🎉🎶💯✅❌❓❗☀🌙🌈⚡❄') },
]

/** emoji 面板：分類頁籤＋格狀選單。點一個就插入，面板繼續開著 */
export const EmojiPicker = forwardRef<HTMLElement, { onPick: (emoji: string) => void }>(function EmojiPicker(
  { onPick },
  ref,
) {
  const [active, setActive] = useState(0)
  const category = CATEGORIES[active]

  return (
    <section className="box emo" aria-label="emoji 面板" ref={ref}>
      <div className="tabs" role="tablist" aria-label="emoji 分類">
        {CATEGORIES.map((item, index) => (
          <button
            key={item.name}
            className={`tab${index === active ? ' on' : ''}`}
            type="button"
            role="tab"
            aria-selected={index === active}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setActive(index)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="eg" role="tabpanel" aria-label={`${category.name}類 emoji`}>
        {category.emojis.map((emoji) => (
          <button
            key={emoji}
            className="eg-btn"
            type="button"
            aria-label={`插入 ${emoji}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </section>
  )
})
