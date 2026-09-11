import type { Config } from 'tailwindcss'
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:   { DEFAULT: '#0f172a', soft: '#334155', mute: '#64748b' },
        line:  '#e2e8f0',
        rcre:  { DEFAULT: '#0b4f6c', deep: '#083548', accent: '#c2703d' },
      },
      fontFamily: { sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config
