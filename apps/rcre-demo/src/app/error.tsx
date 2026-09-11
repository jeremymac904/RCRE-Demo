'use client'
import Link from 'next/link'
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="p-10"><h1 className="font-display text-3xl">We couldn’t load this workspace.</h1><p className="my-5">Your saved records are retained. Retry the request or return to the role selection.</p><button className="btn-primary" onClick={reset}>Try again</button><Link className="ml-5" href="/login">Sign in again</Link></main>}
