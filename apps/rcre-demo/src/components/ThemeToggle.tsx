'use client'

import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'
export const THEME_KEY = 'rcre-theme'

/**
 * Theme toggle.
 *
 * Light is the default. The OS preference is deliberately NOT consulted — a
 * demo that opens dark on one machine and light on another is a demo you have
 * to apologise for before you start.
 *
 * The applied theme is set by an inline script before paint (see layout.tsx),
 * so this component only has to reflect and change it.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const applied = (document.documentElement.getAttribute('data-theme') as Theme) ?? 'light'
    setTheme(applied)
    setReady(true)
  }, [])

  const set = (next: Theme) => {
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem(THEME_KEY, next) } catch { /* private mode */ }
    void fetch('/api/platform/settings/personal').then(async r=>{if(!r.ok)return;const s=await r.json();await fetch('/api/platform/settings/personal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:s.version,value:{...s.value,theme:next}})})}).catch(()=>{})
  }

  // Render the control unstyled-but-present before hydration so the layout
  // does not shift when it becomes interactive.
  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    {
      value: 'light', label: 'Light',
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 1.4v1.7M8 12.9v1.7M14.6 8h-1.7M3.1 8H1.4M12.7 3.3l-1.2 1.2M4.5 11.5l-1.2 1.2M12.7 12.7l-1.2-1.2M4.5 4.5L3.3 3.3"
                stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      value: 'dark', label: 'Dark',
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden>
          <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z"
                stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      ),
    },
  ]

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={`inline-flex items-center gap-0.5 rounded-control border border-hair p-0.5
                  ${compact ? '' : 'w-full'}`}
    >
      {options.map(o => {
        const active = ready && theme === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => set(o.value)}
            aria-pressed={active}
            title={`${o.label} theme`}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-2 py-1.5
                        text-micro uppercase tracking-[0.1em] transition-colors duration-150
                        ${active
                          ? 'bg-ink-elevated text-chalk'
                          : 'text-chalk-faint hover:text-chalk-muted'}`}
          >
            {o.icon}
            {!compact && <span>{o.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
