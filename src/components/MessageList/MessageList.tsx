import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { FeedItem } from '../../hooks/useChat'
import { dayKey, formatDay, formatTime } from '../../lib/time'

interface Props {
  feed: FeedItem[]
  myNickname: string
  imageUrl: (path: string) => string
  onOpenImage: (src: string) => void
}

const OTHER_COLORS = ['c2', 'c3', 'c4']

/** 同一個代號永遠是同一個顏色；自己固定是粉色 */
function chipClass(nickname: string, mine: boolean): string {
  if (mine) return 'c1'
  let hash = 0
  for (const ch of nickname) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0
  return OTHER_COLORS[hash % OTHER_COLORS.length]
}

const NEAR_BOTTOM_PX = 48

export function MessageList({ feed, myNickname, imageUrl, onOpenImage }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  const [unread, setUnread] = useState(false)

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  const last = feed[feed.length - 1]
  const lastKey = last?.key

  // 新項目進來：停在底部就跟著捲；自己送的一律捲到底；往上翻舊訊息時不打斷，只顯示按鈕
  useLayoutEffect(() => {
    if (!last) return
    const mine = last.kind === 'message' && last.message.nickname === myNickname
    if (mine || atBottom.current) {
      scrollToBottom()
      atBottom.current = true
      setUnread(false)
    } else if (last.kind === 'message') {
      setUnread(true)
    }
    // 只在最後一項改變時處理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastKey])

  // 手機鍵盤彈出、視窗縮放時，停在底部的人要繼續停在底部
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (atBottom.current) scrollToBottom()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [scrollToBottom])

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX
    if (atBottom.current) setUnread(false)
  }

  let lastMessageKey: string | null = null
  for (let i = feed.length - 1; i >= 0; i--) {
    if (feed[i].kind === 'message') {
      lastMessageKey = feed[i].key
      break
    }
  }

  let previousAt: string | null = null

  return (
    <div className="msgwrap">
      <div className="msgs" ref={scrollRef} onScroll={onScroll} role="log" aria-label="訊息" aria-live="polite" tabIndex={0}>
        {feed.map((item) => {
          const at = item.kind === 'message' ? item.message.createdAt : item.notice.at
          const newDay = previousAt !== null && dayKey(previousAt) !== dayKey(at)
          previousAt = at

          return (
            <div key={item.key} className="feed-item">
              {newDay && (
                <div className="dv" role="separator">
                  <span>{formatDay(at)}</span>
                </div>
              )}
              {item.kind === 'notice' ? (
                <div className="sys">
                  <span className="st" aria-hidden="true">{item.notice.kind === 'join' ? '★' : '☆'}</span>
                  {item.notice.nickname} {item.notice.kind === 'join' ? '加入了冒險！' : '離開了冒險…'}
                </div>
              ) : (
                <MessageRow
                  item={item}
                  mine={item.message.nickname === myNickname}
                  isLast={item.key === lastMessageKey}
                  imageUrl={imageUrl}
                  onOpenImage={onOpenImage}
                  onImageLoad={() => {
                    if (atBottom.current) scrollToBottom()
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
      {unread && (
        <button
          className="btn sm newb"
          type="button"
          onClick={() => {
            scrollToBottom()
            atBottom.current = true
            setUnread(false)
          }}
        >
          ↓ 有新訊息
        </button>
      )}
    </div>
  )
}

function MessageRow({
  item,
  mine,
  isLast,
  imageUrl,
  onOpenImage,
  onImageLoad,
}: {
  item: Extract<FeedItem, { kind: 'message' }>
  mine: boolean
  isLast: boolean
  imageUrl: (path: string) => string
  onOpenImage: (src: string) => void
  onImageLoad: () => void
}) {
  const { message } = item
  const src = message.imagePath ? imageUrl(message.imagePath) : null

  return (
    <div className={`row${mine ? ' me' : ''}`}>
      <div className="meta">
        <span className={`chip ${chipClass(message.nickname, mine)}`}>{message.nickname}</span>
        <time className="tm" dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
      </div>
      <div className={`box bub${isLast ? ' last' : ''}`}>
        {message.body}
        {src && (
          <button className="pic" type="button" aria-label="放大圖片" onClick={() => onOpenImage(src)}>
            <img src={src} alt={`${message.nickname} 傳的圖片`} onLoad={onImageLoad} />
          </button>
        )}
      </div>
    </div>
  )
}
