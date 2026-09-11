export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-ink-mute">{detail}</p>
    </div>
  )
}
