/**
 * Agent Website Engine — Core Types
 *
 * Defines the shared data model for agent personal websites.
 * All 8 themes consume this same data — the template controls presentation.
 */

// ---------------------------------------------------------------------------
// Theme definitions
// ---------------------------------------------------------------------------

export type AgentWebsiteTheme =
  | 'rcre-signature'
  | 'rcre-luxury'
  | 'rcre-rural'
  | 'rcre-investor'
  | 'rcre-urban'
  | 'rcre-suburban'
  | 'rcre-new-construction'
  | 'rcre-historic'

export interface ThemeMeta {
  id: AgentWebsiteTheme
  name: string
  tagline: string
  description: string
  bestFor: string[]
  recommendedMarkets: string[]
  recommendedAgentTypes: string[]
  conversionStrength: string[]
  personality: string
  // CSS variables set by theme
  cssVars: Record<string, string>
}

export const THEME_CATALOG: Record<AgentWebsiteTheme, ThemeMeta> = {
  'rcre-signature': {
    id: 'rcre-signature',
    name: 'RCRE Signature',
    tagline: 'Premium Southern real estate, modern conversion design',
    description: 'The flagship RCRE template — blends luxury polish with Southern warmth and Jacksonville/Alabama market relevance. Best for agents who want premium presentation without a specialized niche.',
    bestFor: ['First-time buyers', 'Relocation', 'Residential sales', 'Jacksonville', 'Birmingham metro', 'Military moves'],
    recommendedMarkets: ['Jacksonville', 'Northeast Florida', 'Birmingham', 'Central Alabama', 'Florida Gulf Coast'],
    recommendedAgentTypes: ['Generalist', 'Residential specialist', 'Military relocation', 'Buyer specialist'],
    conversionStrength: ['Strong buyer conversion', 'Relocation focus', 'Quick lead capture'],
    personality: 'Confident, warm, modern, Southern-professional',
    cssVars: {
      '--color-primary': '#1a2e4a',
      '--color-accent': '#c9a84c',
      '--color-bg': '#faf8f5',
      '--color-surface': '#ffffff',
      '--color-text': '#1a1a1a',
      '--color-text-muted': '#6b7280',
      '--color-border': '#e5e0d8',
      '--color-cta': '#c9a84c',
      '--color-cta-hover': '#b8953a',
      '--font-display': 'Cormorant Garamond, Georgia, serif',
      '--font-body': 'DM Sans, system-ui, sans-serif',
      '--radius-card': '4px',
    },
  },
  'rcre-luxury': {
    id: 'rcre-luxury',
    name: 'RCRE Luxury',
    tagline: 'Architectural editorial, restrained and refined',
    description: 'Inspired by the Luxury Estate skill — architectural photography, restrained palette, provenance-first copy. For agents serving waterfront, executive relocation, and high-value property markets.',
    bestFor: ['Luxury listings', 'Executive relocation', 'Waterfront', 'Architectural properties', 'High-net-worth buyers'],
    recommendedMarkets: ['Jacksonville waterfront', 'Northeast Florida coastal', ' Ponte Vedra', 'Nocatee', 'Intracoastal'],
    recommendedAgentTypes: ['Luxury specialist', 'Waterfront specialist', 'Relocation specialist'],
    conversionStrength: ['Premium listing presentation', 'Seller confidence', 'Architectural credibility'],
    personality: 'Editorial, restrained, material-honest, architectural',
    cssVars: {
      '--color-primary': '#f4efe6',
      '--color-accent': '#a88a4f',
      '--color-bg': '#faf7f0',
      '--color-surface': '#f4efe6',
      '--color-text': '#1c1c1c',
      '--color-text-muted': '#a6a29a',
      '--color-border': 'rgba(168,138,79,0.3)',
      '--color-cta': '#5c2a2e',
      '--color-cta-hover': '#4a2328',
      '--font-display': 'Cormorant Garamond, Georgia, serif',
      '--font-body': 'DM Sans, system-ui, sans-serif',
      '--radius-card': '0px',
    },
  },
  'rcre-rural': {
    id: 'rcre-rural',
    name: 'RCRE Rural & Land',
    tagline: 'Grounded, regional, premium country property',
    description: 'Inspired by the Rural & Equestrian skill — premium but grounded, warm earth tones, working-land authenticity. For agents serving acreage, land, equestrian, and Alabama rural markets.',
    bestFor: ['Land', 'Acreage', 'Equestrian', 'Farm & ranch', 'USDA markets', 'Rural Alabama'],
    recommendedMarkets: ['Alabama rural', 'Birmingham exurbs', 'Rural North Florida', 'Wiregrass region', 'Black Belt'],
    recommendedAgentTypes: ['Land specialist', 'Equestrian specialist', 'Agricultural property', 'Rural acreage'],
    conversionStrength: ['Land buyer trust', 'USDA financing knowledge', 'Regional authenticity'],
    personality: 'Grounded, plain-spoken, authentic, regional, spacious',
    cssVars: {
      '--color-primary': '#5a4a3a',
      '--color-accent': '#7d8c6a',
      '--color-bg': '#f5f0e6',
      '--color-surface': '#e8dcc4',
      '--color-text': '#1f2a24',
      '--color-text-muted': '#5a4a3a',
      '--color-border': 'rgba(125,140,106,0.3)',
      '--color-cta': '#7a2e2a',
      '--color-cta-hover': '#5e2420',
      '--font-display': 'Playfair Display, Georgia, serif',
      '--font-body': 'Lora, Georgia, serif',
      '--radius-card': '12px',
    },
  },
  'rcre-investor': {
    id: 'rcre-investor',
    name: 'RCRE Investor',
    tagline: 'Numbers-forward, disciplined income-property expertise',
    description: 'Inspired by the Investor-Focused skill — data-driven, cap-rate literate, numbers-first. For agents serving rental investors, BRRRR, STR, multi-family, and portfolio builders.',
    bestFor: ['Rental investors', 'BRRRR', 'Short-term rental', 'Multi-family', 'Portfolio builders', 'Fix-and-flip'],
    recommendedMarkets: ['Jacksonville investment', 'Birmingham investment', 'Florida panhandle', 'Growing metros'],
    recommendedAgentTypes: ['Investment specialist', 'Rental market analyst', 'Commercial-adjacent', 'STR investor'],
    conversionStrength: ['Investor credibility', 'Deal analysis', 'Cap-rate transparency'],
    personality: 'Disciplined, analytical, transparent, data-forward',
    cssVars: {
      '--color-primary': '#0f2d1e',
      '--color-accent': '#22c55e',
      '--color-bg': '#f8faf9',
      '--color-surface': '#ffffff',
      '--color-text': '#0f2d1e',
      '--color-text-muted': '#4a5568',
      '--color-border': '#d1fae5',
      '--color-cta': '#0f2d1e',
      '--color-cta-hover': '#1a4731',
      '--font-display': 'DM Sans, system-ui, sans-serif',
      '--font-body': 'DM Sans, system-ui, sans-serif',
      '--radius-card': '2px',
    },
  },
  'rcre-urban': {
    id: 'rcre-urban',
    name: 'RCRE Urban Modern',
    tagline: 'Tight, urban, material-forward city real estate',
    description: 'Inspired by the Urban Modern skill — geometric, concrete-and-glass palette, technical precision. For agents serving Jacksonville urban core, condo, loft, and new-development markets.',
    bestFor: ['Condo', 'Loft', 'Townhouse', 'New development', 'Urban core', 'Walkable neighborhoods'],
    recommendedMarkets: ['Jacksonville urban core', 'Riverside', 'Avondale', 'San Marco', 'Downtown', 'Florida urban'],
    recommendedAgentTypes: ['Urban specialist', 'Condo expert', 'New development', 'Floor-plan fluent'],
    conversionStrength: ['Urban buyer conversion', 'Building credibility', 'Walkability trust'],
    personality: 'Tight, urban, restrained, precise, technical',
    cssVars: {
      '--color-primary': '#1f1f1f',
      '--color-accent': '#1a4a6e',
      '--color-bg': '#f4f2ee',
      '--color-surface': '#e8eef0',
      '--color-text': '#1f1f1f',
      '--color-text-muted': '#4a5568',
      '--color-border': 'rgba(154,154,154,0.4)',
      '--color-cta': '#e8b339',
      '--color-cta-hover': '#d4a330',
      '--font-display': 'DM Sans, system-ui, sans-serif',
      '--font-body': 'DM Sans, system-ui, sans-serif',
      '--radius-card': '4px',
    },
  },
  'rcre-suburban': {
    id: 'rcre-suburban',
    name: 'RCRE Suburban Family',
    tagline: 'Warm, neighborhood-rooted, school-district expert',
    description: 'Inspired by the Suburban Family skill — warm and residential, school-district literate. For agents serving families, suburban communities, and HOA-driven markets.',
    bestFor: ['Families', 'School districts', 'First-time buyers', 'Suburban communities', 'Move-up buyers'],
    recommendedMarkets: ['Jacksonville suburbs', 'St. Johns County', 'Birmingham suburbs', 'Alabama suburban'],
    recommendedAgentTypes: ['Family specialist', 'Suburban expert', 'School-district knowledgeable', 'HOA fluent'],
    conversionStrength: ['Family trust', 'School information', 'Community depth'],
    personality: 'Warm, residential, neighborhood-rooted, neighborly',
    cssVars: {
      '--color-primary': '#2d4a3e',
      '--color-accent': '#e07b4c',
      '--color-bg': '#f9f6f2',
      '--color-surface': '#ffffff',
      '--color-text': '#2d3748',
      '--color-text-muted': '#718096',
      '--color-border': '#e8ddd4',
      '--color-cta': '#e07b4c',
      '--color-cta-hover': '#c96a3e',
      '--font-display': 'Nunito, system-ui, sans-serif',
      '--font-body': 'Nunito, system-ui, sans-serif',
      '--radius-card': '8px',
    },
  },
  'rcre-new-construction': {
    id: 'rcre-new-construction',
    name: 'RCRE New Construction',
    tagline: 'Precise, architectural, build-process expert',
    description: 'Inspired by the New Construction Modern skill — precise and technical, floor-plan forward. For agents serving spec homes, builder communities, and pre-construction markets.',
    bestFor: ['New construction', 'Spec homes', 'Builder communities', 'Pre-construction', 'Modern homes'],
    recommendedMarkets: ['Nocatee', 'Ponte Vedra', 'Jacksonville new development', 'Birmingham growth corridors'],
    recommendedAgentTypes: ['New-home specialist', 'Builder liaison', 'Pre-construction', 'Design-center expert'],
    conversionStrength: ['Timeline qualification', 'Builder credibility', 'Floor-plan interest'],
    personality: 'Precise, architectural, confident, build-literate',
    cssVars: {
      '--color-primary': '#1a1a2e',
      '--color-accent': '#4f8ef7',
      '--color-bg': '#f8f9fc',
      '--color-surface': '#ffffff',
      '--color-text': '#1a1a2e',
      '--color-text-muted': '#64748b',
      '--color-border': '#e2e8f0',
      '--color-cta': '#4f8ef7',
      '--color-cta-hover': '#3a7ce0',
      '--font-display': 'Outfit, system-ui, sans-serif',
      '--font-body': 'Outfit, system-ui, sans-serif',
      '--radius-card': '2px',
    },
  },
  'rcre-historic': {
    id: 'rcre-historic',
    name: 'RCRE Historic Heritage',
    tagline: 'Legacy, preservation, character-rich properties',
    description: 'For agents specializing in historic homes, preservation properties, and character-rich residences. Editorial, legacy-forward design with deep community context.',
    bestFor: ['Historic homes', 'Period properties', 'Preservation', 'Character homes', 'Century homes'],
    recommendedMarkets: ['Birmingham historic', 'Jacksonville historic', 'Florida historic districts', 'Alabama antebellum'],
    recommendedAgentTypes: ['Historic specialist', 'Preservation advocate', 'Period-home expert', 'Character-home'],
    conversionStrength: ['Preservation credibility', 'Legacy buyer trust', 'Story-rich content'],
    personality: 'Editorial, legacy-forward, preservation-minded, community-rooted',
    cssVars: {
      '--color-primary': '#3d2b1f',
      '--color-accent': '#8b6914',
      '--color-bg': '#f7f3ed',
      '--color-surface': '#f0e8dc',
      '--color-text': '#2d1f15',
      '--color-text-muted': '#6b5a4a',
      '--color-border': '#d4c4a8',
      '--color-cta': '#8b6914',
      '--color-cta-hover': '#6b5010',
      '--font-display': 'Playfair Display, Georgia, serif',
      '--font-body': 'Source Serif 4, Georgia, serif',
      '--radius-card': '0px',
    },
  },
}

// ---------------------------------------------------------------------------
// Agent website configuration
// ---------------------------------------------------------------------------

export interface AgentProfile {
  // Core identity (sourced from agents.json + website customization)
  slug: string
  name: string
  title: string
  phone: string
  email: string
  license: string
  market: string
  bio: string
  headshot?: string
  role?: string
  socialLinks?: {
    instagram?: string
    linkedin?: string
    facebook?: string
    youtube?: string
    tiktok?: string
  }
  // Extended fields used by demo agents (optional on real agents)
  markets?: string[]
  specialties?: string[]
  tagline?: string
  headline?: string
  heroImage?: string
  // Website customization
  website?: Partial<AgentWebsiteConfig>
}

export interface AgentWebsiteConfig {
  theme: AgentWebsiteTheme
  // Profile
  tagline?: string
  headline?: string
  heroImage?: string
  // Content selection
  markets: string[]
  specialties: string[]
  featuredListings?: string[]     // listing IDs
  featuredArticles?: string[]      // article IDs
  featuredVideos?: string[]
  // CTA preference
  ctaText?: string
  ctaType?: 'schedule' | 'inquire' | 'call' | 'form'
  // Domain
  domain?: string
  customDomain?: string
  subdomain?: string
  // SEO
  seoTitle?: string
  seoDescription?: string
  // State
  published: boolean
  lastUpdated: string
  createdAt: string
  // Completeness score (0-100)
  completenessScore: number
}

export interface AgentWebsiteState {
  config: AgentWebsiteConfig
  profile: AgentProfile
  completenessIssues: string[]
  publishState: 'draft' | 'review' | 'published' | 'suspended'
  brokerNotes?: string
}

// ---------------------------------------------------------------------------
// Lead types
// ---------------------------------------------------------------------------

export interface LeadCapture {
  id: string
  agentSlug: string
  source: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  landingPage?: string
  timestamp: string
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  type: 'buyer' | 'seller' | 'valuation' | 'relocation' | 'general' | 'investor' | 'preferred_lender'
  name?: string
  email?: string
  phone?: string
  message?: string
  propertyInterest?: string
  budget?: string
  timeline?: string
  sourcePage?: string
}

// ---------------------------------------------------------------------------
// SEO / Structured data types
// ---------------------------------------------------------------------------

export interface SEOMetadata {
  title: string
  description: string
  canonical: string
  ogTitle: string
  ogDescription: string
  ogImage?: string
  ogType: 'website' | 'profile' | 'article'
  twitterCard: 'summary_large_image' | 'summary'
  structuredData: Record<string, unknown>[]
}
