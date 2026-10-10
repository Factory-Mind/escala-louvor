import { loadMembers } from '@/server/queries'
import { MemberList } from './member-list'

export const dynamic = 'force-dynamic'

export default async function MembersPage() {
  const members = await loadMembers()

  return <MemberList members={members} />
}
