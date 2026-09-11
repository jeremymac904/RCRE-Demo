import './globals.css'
import type { Metadata } from 'next'
import { Syne, Nunito_Sans } from 'next/font/google'

// RCRE's actual typefaces, confirmed from the live site's Google Fonts links.
const syne = Syne({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-syne', display: 'swap' })
const nunito = Nunito_Sans({ subsets: ['latin'], weight: ['300', '400', '600', '700'], variable: '--font-nunito', display: 'swap' })

export const metadata: Metadata = {
  title: 'RCRE AI — Agent Platform',
  description: 'The technology RCRE gives its agents.',
}

/**
 * Applies the stored theme before first paint so there is no flash of the
 * wrong theme. Defaults to light; the OS preference is not consulted.
 */
const THEME_INIT = `(function(){try{var t=localStorage.getItem('rcre-theme');if(t!=='dark'&&t!=='light')t='light';document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is intentionally NOT server-rendered. THEME_INIT sets it in
    // <head> before first paint, so there is no flash — and no server/client
    // attribute mismatch for React to complain about. With JavaScript off,
    // the bare :root rule in globals.css already resolves to light.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${syne.variable} ${nunito.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
