import { handleDurableNotificationJob } from '@/lib/services/notification-job'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleDurableNotificationJob(request)
}
