import { KnowledgeSourceClient } from './KnowledgeSourceClient'

export const dynamic = 'force-dynamic'

export default async function KnowledgeSourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <KnowledgeSourceClient id={id} />
}
