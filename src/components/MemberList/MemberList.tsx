import type { Member } from '../../types'

interface Props {
  members: Member[]
  myNickname: string
  /** panel：手機頂部展開的名單；side：電腦右側的名單 */
  variant: 'panel' | 'side'
  id?: string
}

export function MemberList({ members, myNickname, variant, id }: Props) {
  return (
    <section className={`box mem ${variant === 'side' ? 'side mem-side' : 'mem-panel'}`} id={id} aria-label="在線名單">
      <h3>★ 冒險者名單（{members.length}）</h3>
      <ul>
        {members.map((member) => (
          <li key={member.nickname}>
            <span className="pip" aria-hidden="true" />
            <span className="mem-name">{member.nickname}</span>
            {member.nickname === myNickname && <span className="me-tag">（你）</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
