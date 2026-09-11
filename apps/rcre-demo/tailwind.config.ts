import type { Config } from 'tailwindcss'

/**
 * RCRE design tokens.
 *
 * Colours resolve to CSS custom properties defined in globals.css, so the same
 * utility class re-themes rather than needing a `dark:` variant on every
 * element. Light is the default; dark is [data-theme="dark"] on <html>.
 *
 * Brass is split deliberately:
 *   brass.fill  #cfb077 in both themes — fills, borders, decorative marks
 *   brass       readable brass for TEXT — drops to #8a6a2e on light, where
 *               #cfb077 would sit at roughly 2:1 against white
 *
 * DISCIPLINE: brass marks the single most important thing on a screen. If two
 * things are brass, one of them is wrong.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT:  'var(--bg)',
          raised:   'var(--surface)',
          elevated: 'var(--elevated)',
          overlay:  'var(--overlay)',
          sunken:   'var(--sunken)',
        },
        brass: {
          DEFAULT: 'var(--brass-ink)',
          ink: 'var(--brass-ink)',
          fill:    'var(--brass-fill)',
          bright:  'var(--brass-bright)',
          dim:     'var(--brass-dim)',
        },
        chalk: {
          DEFAULT: 'var(--text)',
          muted:   'var(--text-muted)',
          faint:   'var(--text-faint)',
        },
        hair: {
          DEFAULT: 'var(--hair)',
          strong:  'var(--hair-strong)',
          brass:   'var(--hair-brass)',
        },
        signal: {
          urgent: 'var(--urgent)',
          warm:   'var(--warm)',
          calm:   'var(--calm)',
        },
      },
      fontFamily: {
        display: ['var(--font-syne)', 'Syne', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-nunito)', 'Nunito Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'micro': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.12em' }],
        'label': ['0.75rem',   { lineHeight: '1.1rem', letterSpacing: '0.08em' }],
        'body':  ['0.9375rem', { lineHeight: '1.6rem' }],
        'lead':  ['1.0625rem', { lineHeight: '1.75rem' }],
        'h4':    ['1.125rem',  { lineHeight: '1.5rem',  letterSpacing: '-0.005em' }],
        'h3':    ['1.5rem',    { lineHeight: '1.9rem',  letterSpacing: '-0.015em' }],
        'h2':    ['2rem',      { lineHeight: '2.4rem',  letterSpacing: '-0.02em' }],
        'h1':    ['2.75rem',   { lineHeight: '3.1rem',  letterSpacing: '-0.025em' }],
        'hero':  ['4rem',      { lineHeight: '4.2rem',  letterSpacing: '-0.035em' }],
      },
      spacing: { section: '5.5rem', 'section-sm': '3.5rem' },
      borderRadius: { panel: '10px', control: '7px' },
      maxWidth: { shell: '96rem', prose: '38rem' },
      boxShadow: {
        panel:  'var(--shadow-panel)',
        raised: 'var(--shadow-raised)',
      },
      transitionTimingFunction: { out: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
      animation: {
        /* Motion only where it communicates state — never on page load. */
        'fade-in': 'fade-in 140ms ease-out both',
        'slide-down': 'slide-down 160ms cubic-bezier(0.16,1,0.3,1) both',
        'pulse-soft': 'pulse-soft 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
