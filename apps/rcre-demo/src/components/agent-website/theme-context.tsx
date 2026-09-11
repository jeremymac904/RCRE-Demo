'use client'
/**
 * Agent Website Theme Context
 *
 * Provides the active theme configuration and CSS variables to all
 * theme-aware components. Wrapped in a React context so themes can
 * be switched without a full page reload during preview.
 */

import React, { createContext, useContext } from 'react'
import type { AgentWebsiteTheme, AgentProfile, AgentWebsiteConfig } from '@/lib/agent-website/types'
import { THEME_CATALOG } from '@/lib/agent-website/types'

interface ThemeContextValue {
  theme: AgentWebsiteTheme
  meta: (typeof THEME_CATALOG)[AgentWebsiteTheme]
  profile: AgentProfile
  config: AgentWebsiteConfig
  cssVars: Record<string, string>
  isPreview?: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function AgentWebsiteThemeProvider({
  theme,
  profile,
  config,
  isPreview = false,
  children,
}: {
  theme: AgentWebsiteTheme
  profile: AgentProfile
  config: AgentWebsiteConfig
  isPreview?: boolean
  children: React.ReactNode
}) {
  const meta = THEME_CATALOG[theme]
  // Merge catalog defaults with config overrides (extract string-valued overrides)
  const cssVars: Record<string, string> = { ...meta.cssVars }
  for (const [k, v] of Object.entries(config)) {
    if (typeof v === 'string') cssVars[k] = v
  }

  return (
    <ThemeContext.Provider value={{ theme, meta, profile, config, cssVars, isPreview }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `:root { ${Object.entries(cssVars).map(([k, v]) => `${k}: ${v}`).join('; ')} }`,
        }}
      />
      {children}
    </ThemeContext.Provider>
  )
}

export function useAgentTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Fallback for SSR
    return {
      theme: 'rcre-signature',
      meta: THEME_CATALOG['rcre-signature'],
      profile: {} as AgentProfile,
      config: {} as AgentWebsiteConfig,
      cssVars: THEME_CATALOG['rcre-signature'].cssVars,
    }
  }
  return ctx
}
