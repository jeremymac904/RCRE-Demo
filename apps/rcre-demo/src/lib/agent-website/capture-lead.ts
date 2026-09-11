/**
 * Lead Capture — Client-safe module
 *
 * This file contains only the client-side lead capture logic.
 * It is safe to import in both server and client components.
 * (It does NOT import from platform/store or platform/service.)
 */

export type LeadType =
  | 'buyer'
  | 'seller'
  | 'valuation'
  | 'relocation'
  | 'general'
  | 'investor'
  | 'preferred_lender'

export interface CreateLeadInput {
  agentSlug: string
  type: LeadType
  name?: string
  email?: string
  phone?: string
  message?: string
  propertyInterest?: string
  budget?: string
  timeline?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  landingPage?: string
}

export function captureLead(input: CreateLeadInput): { referenceId: string; accepted: boolean } {
  // In synthetic mode: return a reference, record locally
  // In production: POST to /api/leads which routes to FUB (with Jeremy's authorization)
  const referenceId = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  // Storage is deferred to the API route — this function is synchronous and server-client safe
  return { referenceId, accepted: true }
}
