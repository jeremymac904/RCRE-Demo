import { GET as readSearchState, PUT as replaceSearchState } from '@/app/api/public/search-state/route'

export const runtime = 'nodejs'
export const GET = readSearchState
export const PUT = replaceSearchState
