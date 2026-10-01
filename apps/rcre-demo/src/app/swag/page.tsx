import { AppShell } from '@/components/AppShell'
import { BrandResources, BrandResourcesUnavailable } from '@/components/brand-resources/BrandResources'
import { getBrandResourceContext } from '@/lib/brand-resources/server'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Swag and Brand Resources', robots: { index: false, follow: false } }
export default async function Page() {
  const context = await getBrandResourceContext()
  if (context.kind === 'unavailable') return <BrandResourcesUnavailable />
  return <AppShell user={context.user}><BrandResources mode='catalog' agents={context.agents} admin={context.admin} /></AppShell>
}
