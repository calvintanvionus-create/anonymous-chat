import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatService } from '../services/ChatService'
import type { ConnectionStatus, JoinResult, Member, Message, SendResult, SystemNotice } from '../types'
import { validateNickname } from '../lib/validate'

/** 訊息流裡的一項：訊息，或「某某 進來了」這類系統提示 */
export type FeedItem =
  | { kind: 'message'; key: string; message: Message }
  | { kind: 'notice'; key: string; notice: SystemNotice }

export type Phase = 'join' | 'room'

/** 把服務發出的事件，整理成畫面可以直接用的狀態 */
export function useChat(service: ChatService) {
  const [phase, setPhase] = useState<Phase>('join')
  const [nickname, setNickname] = useState('')
  const [status, setStatus] = useState<ConnectionStatus>('offline')
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [typing, setTyping] = useState<string[]>([])

  const myNickname = useRef('')
  const noticeSeq = useRef(0)

  useEffect(() => {
    const off = [
      service.on('connection:status', setStatus),
      service.on('history:loaded', (messages) => {
        setFeed(messages.map((message) => ({ kind: 'message', key: `m${message.id}`, message })))
      }),
      service.on('message:new', (message) => {
        setFeed((items) =>
          items.some((item) => item.kind === 'message' && item.message.id === message.id)
            ? items
            : [...items, { kind: 'message', key: `m${message.id}`, message }],
        )
      }),
      service.on('presence:sync', setMembers),
      service.on('presence:join', (member) => addNotice('join', member)),
      service.on('presence:leave', (member) => addNotice('leave', member)),
      service.on('typing:update', setTyping),
    ]

    function addNotice(kind: SystemNotice['kind'], member: Member) {
      if (member.nickname === myNickname.current) return
      const notice: SystemNotice = { kind, nickname: member.nickname, at: new Date().toISOString() }
      setFeed((items) => [...items, { kind: 'notice', key: `n${noticeSeq.current++}`, notice }])
    }

    return () => off.forEach((unsubscribe) => unsubscribe())
  }, [service])

  const join = useCallback(
    async (raw: string): Promise<JoinResult> => {
      const check = validateNickname(raw)
      if (!check.ok) return { ok: false, reason: 'nickname_invalid' }
      myNickname.current = check.value
      setFeed([])
      setMembers([])
      setTyping([])
      const result = await service.join(check.value)
      if (result.ok) {
        setNickname(check.value)
        setPhase('room')
      } else {
        myNickname.current = ''
      }
      return result
    },
    [service],
  )

  const send = useCallback(
    (input: { body: string; image?: File | null }): Promise<SendResult> => service.sendMessage(input),
    [service],
  )

  const notifyTyping = useCallback((isTyping: boolean) => service.setTyping(isTyping), [service])

  const leave = useCallback(() => {
    service.leave()
    myNickname.current = ''
    setPhase('join')
    setNickname('')
    setFeed([])
    setMembers([])
    setTyping([])
  }, [service])

  return { phase, nickname, status, feed, members, typing, join, send, notifyTyping, leave }
}
