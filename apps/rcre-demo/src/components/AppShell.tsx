'use client'

import Link from 'next/link'
import {PersonalPreferences} from './PersonalPreferences'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Logo } from './Logo'
import { Avatar } from './Avatar'
import { ThemeToggle } from './ThemeToggle'

/**
 * Application shell.
 *
 * A narrow rail on desktop, a sheet on mobile. The navigation is deliberately
 * short — the smallest set that tells the whole story. Everything else lives
 * one level in, reached from the page that owns it.
 */

export interface NavItem { href: string; label: string }

const AGENT_NAV: NavItem[] = [
  { href: '/today',     label: 'Today' },
  { href: '/assistant', label: 'RCRE AI' },
  { href: '/crm',       label: 'Contacts' },
  { href: '/pipeline',  label: 'Pipeline' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/marketing', label: 'Marketing' },
  { href: '/training',  label: 'Training' },
]

const BROKER_NAV: NavItem[] = [
  { href: '/command',    label: 'Command' },
  { href: '/assistant',  label: 'RCRE AI' },
  { href: '/recruiting', label: 'Recruiting' },
  { href: '/agents',     label: 'Agents' },
  { href: '/crm',        label: 'Contacts' },
  { href: '/pipeline',   label: 'Pipeline' },
]

export function AppShell({
  user, children,
}: {
  user: { name: string; initials: string; title: string; photo?: string; role: 'agent' | 'broker'; platformRole?: string }
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const role=user.platformRole??user.role
  const nav = role==='transaction_coordinator' ? [{href:'/transactions',label:'Transactions'},{href:'/assistant',label:'RCRE AI'},{href:'/training',label:'Training'}] : role==='marketing_admin' ? [{href:'/marketing',label:'Content Library'},{href:'/admin/website',label:'Website studio'},{href:'/approvals',label:'Approvals'},{href:'/training/community',label:'Community'}] : role==='trainer' ? [{href:'/training',label:'Training'},{href:'/training/manage',label:'Authoring'},{href:'/training/community',label:'Community'}] : user.role === 'broker' ? BROKER_NAV : AGENT_NAV

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const navLinks = (
    <nav className="flex flex-col gap-0.5">
      {nav.map(item => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={`relative rounded-control px-3 py-2 text-[0.8125rem] font-medium
                      transition-colors duration-150 ${
            isActive(item.href)
              ? 'bg-ink-elevated text-chalk'
              : 'text-chalk-muted hover:bg-ink-elevated/70 hover:text-chalk'
          }`}
        >
          {isActive(item.href) && (
            <span aria-hidden
                  className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-brass-fill" />
          )}
          <span className="flex items-center gap-2.5 pl-1.5">{item.label}</span>
        </Link>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-ink"><PersonalPreferences/>
      {/* Mobile bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-hair bg-ink-raised/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link aria-label="RCRE workspace home" href={user.role === 'broker' ? '/command' : '/today'}>
          <Logo className="text-chalk" />
        </Link>
        <button
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="rounded-control border border-hair p-2 text-chalk-muted transition-colors hover:text-chalk"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            {open ? (
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="animate-slide-down border-b border-hair bg-ink-raised px-4 py-4 lg:hidden">
          {navLinks}<div className="flex flex-wrap gap-4 py-4 text-sm"><Link href="/settings">Settings</Link><Link href="/workspace-search">Search workspace</Link><Link href="/notifications">Notifications</Link><Link href="/approvals">Approvals</Link>{['agent','team_leader','managing_broker','broker_owner','marketing_admin'].includes(role)&&<Link href="/calendar">Calendar</Link>}<Link href="/">Website</Link></div>
          <div className="divider mt-4 space-y-3 pt-4">
            <ThemeToggle />
            <Link prefetch={false} href="/api/session" className="block text-[0.8125rem] text-chalk-muted hover:text-chalk">
              Sign out
            </Link>
          </div>
        </div>
      )}

      <div className="lg:flex">
        {/* Desktop rail */}
        <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col justify-between
                          gap-6 overflow-y-auto border-r border-hair bg-ink-raised px-5 py-6 lg:flex">
          <div className="min-h-0">
            <Link href={user.role === 'broker' ? '/command' : '/today'} aria-label="RCRE workspace home" className="mb-8 block">
              <Logo className="text-chalk" />
            </Link>
            {navLinks}
            <nav aria-label="Workspace tools" className="mt-5 pt-4 border-t border-hair flex flex-col gap-2 text-sm text-chalk-muted">
              {['agent','broker_owner','managing_broker','team_leader'].includes(role)&&<>{['agent','team_leader','managing_broker','broker_owner','marketing_admin'].includes(role)&&<Link href="/calendar">Calendar</Link>}<Link href="/listings">Listings</Link></>}
              <Link href="/workspace-search">Search workspace</Link><Link href="/notifications">Notifications</Link><Link href="/approvals">Approvals</Link>
              <Link href="/settings">Settings</Link>
              {role==='broker_owner'&&<><Link href="/integrations">Integrations</Link><Link href="/admin/website">Website studio</Link><Link href="/transactions">Transactions</Link><Link href="/admin/audit">Audit trail</Link></>}
              <Link href="/">Public website</Link>
            </nav>
          </div>

          <div className="shrink-0 space-y-3.5">
            <ThemeToggle />
            <div className="flex items-center gap-1.5">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brass-fill" />
              <span className="text-micro uppercase tracking-[0.12em] text-chalk-faint">
                Demo environment
              </span>
            </div>
            <div className="divider pt-3.5">
              <div className="flex items-center gap-3">
                <Avatar initials={user.initials} photo={user.photo} name={user.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8125rem] font-medium text-chalk">{user.name}</p>
                  <p className="truncate text-micro tracking-normal text-chalk-faint">{user.title}</p>
                </div>
              </div>
              <Link prefetch={false} href="/api/session"
                 className="mt-3 block text-micro uppercase tracking-[0.12em] text-chalk-faint transition-colors hover:text-chalk">
                Sign out
              </Link>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
