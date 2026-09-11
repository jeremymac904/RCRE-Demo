/**
 * Agent Website Data Service
 *
 * Reads agent profiles from agents.json and agent website configs from the
 * platform store. Provides a unified interface for all theme rendering.
 * No writes — configs are managed through the portal.
 */

import { readRecords } from '@/lib/platform/store'
import { getSetting } from '@/lib/platform/service'
import type {
  AgentProfile,
  AgentWebsiteConfig,
  AgentWebsiteState,
  AgentWebsiteTheme,
  THEME_CATALOG,
} from './types'
import { THEME_CATALOG as CATALOG } from './types'
import { completenessScore } from './seo'

const STORE_KEY = 'agent_website_configs'

// ---------------------------------------------------------------------------
// Agent profile (from agents.json)
// ---------------------------------------------------------------------------

export function getAgentProfile(slug: string): AgentProfile | null {
  const agents = readRecords<AgentProfile>('public_agents')
  const agent = agents.find((a) => a.slug === slug) || fallbackAgent(slug)
  if (!agent) return null

  // Merge website customization on top
  const websiteConfig = getWebsiteConfig(slug)
  return {
    ...agent,
    website: websiteConfig ?? undefined,
  }
}

export function listAgentProfiles(): AgentProfile[] {
  return readRecords<AgentProfile>('public_agents')
}

export function getBrokerProfiles(): AgentProfile[] {
  return listAgentProfiles().filter(
    (a) => !['broker_owner', 'transaction_coordinator', 'tc'].includes(a.role || '')
  )
}

// ---------------------------------------------------------------------------
// Website config (from platform store)
// ---------------------------------------------------------------------------

export function getWebsiteConfig(slug: string): AgentWebsiteConfig | null {
  const configs = readRecords<Record<string, AgentWebsiteConfig>>(STORE_KEY)
  // readRecords returns T[] — find the config whose key matches slug
  const stored = configs.find((c) => slug in c)?.[slug]
  if (stored) return stored

  // Default config for agents without a saved website
  return defaultWebsiteConfig(slug)
}

export function getWebsiteState(slug: string): AgentWebsiteState | null {
  const profile = getAgentProfile(slug)
  if (!profile) return null

  const config = getWebsiteConfig(slug)
  if (!config) return null

  const { score, issues } = completenessScore(profile, config)

  return {
    config: { ...config, completenessScore: score },
    profile,
    completenessIssues: issues,
    publishState: config.published ? 'published' : 'draft',
  }
}

export function listWebsiteStates(): AgentWebsiteState[] {
  return getBrokerProfiles()
    .map((a) => getWebsiteState(a.slug))
    .filter((s): s is AgentWebsiteState => s !== null)
}

// ---------------------------------------------------------------------------
// Theme helpers
// ---------------------------------------------------------------------------

export function getThemeMeta(theme: AgentWebsiteTheme) {
  return CATALOG[theme]
}

export function listThemes(): typeof CATALOG[keyof typeof CATALOG][] {
  return Object.values(CATALOG)
}

// ---------------------------------------------------------------------------
// Lead management
// ---------------------------------------------------------------------------

export interface CreateLeadInput {
  agentSlug: string
  type: 'buyer' | 'seller' | 'valuation' | 'relocation' | 'general' | 'investor' | 'preferred_lender'
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

export { captureLead } from './capture-lead'

// ---------------------------------------------------------------------------
// Demo-agent theme overrides
// ---------------------------------------------------------------------------

const DEMO_THEME_OVERRIDES: Partial<Record<string, AgentWebsiteTheme>> = {
  'jacksonville-luxury': 'rcre-luxury',
  'alabama-rural': 'rcre-rural',
  'jacksonville-newconstruction': 'rcre-new-construction',
  'birmingham-historic': 'rcre-historic',
}

export function getAgentTheme(slug: string): AgentWebsiteTheme {
  return DEMO_THEME_OVERRIDES[slug] ?? 'rcre-signature'
}

// ---------------------------------------------------------------------------
// Default config factory
// ---------------------------------------------------------------------------

function defaultWebsiteConfig(slug: string): AgentWebsiteConfig {
  const agent = readRecords<AgentProfile>('public_agents').find((a) => a.slug === slug)
  return {
    theme: getAgentTheme(slug),
    markets: agent?.market ? [agent.market] : [],
    specialties: [],
    published: false,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    completenessScore: 0,
  }
}

// ---------------------------------------------------------------------------
// Fallback agent for unknown slugs
// ---------------------------------------------------------------------------

function fallbackAgent(slug: string): AgentProfile | null {
  // Check for reserved demo slugs
  const demos: Record<string, Partial<AgentProfile>> = {
    'alex-verastegui': {
      slug: 'alex-verastegui',
      name: 'Alex Verastegui',
      title: 'REALTOR®',
      phone: '(904) 532-0068',
      email: 'alex@rcregroup.com',
      license: 'SL3438292',
      market: 'Florida',
      bio: 'He is a versatile professional who has journeyed from Peru to New York and Jacksonville, embodying adaptability. His career in sales and account development is driven by a passion for helping others succeed.',
    },
    'julio-arango': {
      slug: 'julio-arango',
      name: 'Julio Arango',
      title: 'Qualifying Broker',
      phone: '(904) 575-0970',
      email: 'julio@rcregroup.com',
      license: '000169761, 442573, 3454903',
      market: 'Alabama & Florida',
      bio: 'I understand life\'s daily challenges, and I believe buying or selling your home shouldn\'t be one of them. My focus is on your needs and goals, building lasting relationships.',
    },
  }
  const found = demos[slug]
  return found ? { slug, bio: '', title: '', phone: '', email: '', license: '', market: '', ...found } as AgentProfile : null
}

// ---------------------------------------------------------------------------
// Example agent sites — used for demo
// ---------------------------------------------------------------------------

export const EXAMPLE_AGENTS = {
  // Luxury: Jacksonville agent using RCRE Luxury
  'jacksonville-luxury': {
    slug: 'jacksonville-luxury',
    name: 'Alexandra Whitfield',
    title: 'Luxury REALTOR®',
    phone: '(904) 555-0198',
    email: 'alexandra.whitfield@rcregroup.com',
    license: 'SL4001234',
    market: 'Northeast Florida',
    bio: 'Alexandra Whitfield has spent fifteen years navigating the nuances of Northeast Florida\'s most coveted waterfront and estate communities. Her practice centers on discretion, architectural literacy, and the understanding that a significant property transaction is rarely just about real estate. She has represented buyers and sellers in Ponte Vedra, Nocatee, and the Southbank corridor, with transactions ranging from primary residences to legacy estate acquisitions.',
    markets: ['Jacksonville', 'Ponte Vedra', 'Nocatee', 'Southbank', 'Mandarin'],
    specialties: ['Waterfront', 'Luxury Estates', 'Relocation', 'Intracoastal', 'New Construction'],
    tagline: 'Estate and waterfront, handled with discretion.',
    headline: 'Properties of Provenance in Northeast Florida',
    heroImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80',
    headshot: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
    socialLinks: {
      linkedin: 'https://linkedin.com/in/alexandra-whitfield',
      instagram: 'https://instagram.com/alexandra.whitfield.rcre',
    },
  },
  // Rural: Alabama agent using RCRE Rural
  'alabama-rural': {
    slug: 'alabama-rural',
    name: 'Coleman Reid',
    title: 'Land & Rural Property Specialist',
    phone: '(205) 555-0274',
    email: 'coleman.reid@rcregroup.com',
    license: 'AL-000123456',
    market: 'Alabama',
    bio: 'Coleman Reid was born on a working farm in the Alabama Wiregrass. He understands what it means to walk a fence line at dawn and why a reliable water source matters more than square footage. After a decade in agricultural finance, he transitioned to rural real estate, specializing in acreage, timberland, equestrian properties, and the unique USDA and farm-service financing that comes with them. His clients are buyers who want space — to work, to raise animals, to hunt, to breathe.',
    markets: ['Birmingham exurbs', 'Wiregrass Alabama', 'Black Belt', 'Lake Martin', 'Tuscaloosa County'],
    specialties: ['Land', 'Acreage', 'Equestrian', 'Timber', 'USDA Rural', 'Farm & Ranch'],
    tagline: 'Land that means something. Representation that does too.',
    headline: 'Alabama Land, Handled by Someone Who Knows It',
    heroImage: 'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=1600&q=80',
    headshot: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    socialLinks: {
      linkedin: 'https://linkedin.com/in/coleman-reid-land',
    },
  },
  // Signature: generalist using RCRE Signature
  'rcre-signature-demo': {
    slug: 'rcre-signature-demo',
    name: 'Jordan Mercer',
    title: 'REALTOR®',
    phone: '(904) 555-0341',
    email: 'jordan.mercer@rcregroup.com',
    license: 'SL3928471',
    market: 'Jacksonville & Alabama',
    bio: 'Jordan Mercer brings structured, relationship-first service to every transaction — whether it\'s a first home in Jacksonville, a move-up in St. Johns County, or a rural acreage purchase in Alabama. Trained in the RCRE platform, Jordan leverages AI-assisted market analysis, rigorous deadline tracking, and the full RCRE transaction OS to keep every deal on track. The goal is always the same: help the client reach the right outcome, on time, without surprises.',
    markets: ['Jacksonville', 'St. Johns County', 'Birmingham', 'Central Alabama'],
    specialties: ['First-Time Buyers', 'Residential', 'Relocation', 'Military Moves', 'Investment'],
    tagline: 'Structured service. Real results. RCRE-powered.',
    headline: 'Your RCRE Agent, Working for You',
    heroImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80',
    headshot: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80',
    socialLinks: {
      linkedin: 'https://linkedin.com/in/jordan-mercer-rcre',
      instagram: 'https://instagram.com/jordan.mercer.rcre',
      facebook: 'https://facebook.com/jordanmercerrcre',
    },
  },
  // Urban: Jacksonville urban specialist using RCRE Urban Modern
  'jacksonville-urban': {
    slug: 'jacksonville-urban',
    name: 'Priya Nair',
    title: 'Urban REALTOR®',
    phone: '(904) 555-0187',
    email: 'priya.nair@rcregroup.com',
    license: 'SL3847562',
    market: 'Jacksonville Urban Core',
    bio: 'Priya Nair has spent eight years in the Jacksonville urban core — San Marco, Riverside, Avondale, and the downtown residential towers. She knows the difference between a condo HOA that actually maintains its building and one that doesn\'t. She knows which blocks get the afternoon shade and which streets flood in heavy rain. Her clients are buyers and renters who want to live in the city — and who want an agent who already lives there too.',
    markets: ['Riverside', 'Avondale', 'San Marco', 'Downtown Jacksonville', 'Brooklyn'],
    specialties: ['Urban Condo', 'Loft', 'Townhouse', 'Walkability', 'New Development', 'HOA Evaluation'],
    tagline: 'The city, from someone who lives it.',
    headline: 'Jacksonville Urban. From Someone Who Knows It.',
    heroImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&q=80',
    headshot: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
    socialLinks: {
      linkedin: 'https://linkedin.com/in/priya-nair-rcre',
      instagram: 'https://instagram.com/priya.nair.rcre',
    },
  },
  // New Construction: Northeast Florida builder-relationship specialist
  'jacksonville-newconstruction': {
    slug: 'jacksonville-newconstruction',
    name: 'Marcus Webb',
    title: 'New Construction REALTOR®',
    phone: '(904) 555-0287',
    email: 'marcus.webb@rcregroup.com',
    license: 'SL3881204',
    market: 'Northeast Florida',
    bio: 'Marcus Webb has closed over forty new construction transactions in the Jacksonville market, representing buyers in Nocatee, Silverleaf, the Communities at Durbin Creek, and Jacksonville\'s newest waterfront developments. He knows the difference between a spec home and a custom build, understands the builder contract negotiation points that matter, and has relationships with the regional builders most active in Northeast Florida. His clients avoid the five most common new construction mistakes because he walks them through every phase: pre-construction, design center, construction, closing, and warranty.',
    markets: ['Nocatee', 'Silverleaf', 'Durbin Creek', 'Jacksonville New Development', 'St. Johns County'],
    specialties: ['New Construction', 'Builder Representation', 'Pre-Construction', 'Design Center', 'Warranty Review'],
    tagline: 'New construction, without the surprises.',
    headline: 'Nocatee to Downtown. Built with a Broker Who Knows the Builders.',
    heroImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80',
    headshot: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
    socialLinks: {
      linkedin: 'https://linkedin.com/in/marcus-webb-rcre',
    },
  },
  // Historic Heritage: Birmingham period-home and preservation specialist
  'birmingham-historic': {
    slug: 'birmingham-historic',
    name: 'Eleanor Whitmore',
    title: 'Historic & Heritage Property Specialist',
    phone: '(205) 555-0391',
    email: 'eleanor.whitmore@rcregroup.com',
    license: 'AL-000789012',
    market: 'Birmingham, Alabama',
    bio: 'Eleanor Whitmore has spent twelve years specializing in Birmingham\'s most storied residential neighborhoods — Highland Park, Mountain Brook, English Village, and the historic Cahaba Heights corridor. She approaches historic properties with the understanding that a 1920s Tudor is not just a house — it is a structure with stories, materials, and mechanical systems that require informed stewardship. Her clients are buyers who understand that character costs more upfront and pays dividends in the long run. She works with preservation-minded buyers, estate sales, and families settling historic properties.',
    markets: ['Highland Park', 'Mountain Brook', 'English Village', 'Cahaba Heights', 'Birmingham Historic Districts'],
    specialties: ['Historic Homes', 'Period Properties', 'Preservation', 'Estate Sales', 'Character Homes'],
    tagline: 'Historic homes, preservation-minded guidance.',
    headline: 'Birmingham\'s Historic Neighborhoods. Represented with Care.',
    heroImage: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?w=1600&q=80',
    headshot: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
    socialLinks: {
      linkedin: 'https://linkedin.com/in/eleanor-whitmore-rcre',
      instagram: 'https://instagram.com/eleanor.whitmore.rcre',
    },
  },
}

export function getExampleAgent(slug: keyof typeof EXAMPLE_AGENTS) {
  return EXAMPLE_AGENTS[slug] ?? null
}

export function listExampleAgents() {
  return Object.values(EXAMPLE_AGENTS)
}
