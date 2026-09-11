export function PageHeader({
  eyebrow, title, sub, action,
}: { eyebrow?: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-hair pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-h2 font-600 text-chalk">{title}</h1>
        {sub && <p className="mt-2 max-w-prose text-body text-chalk-muted">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
