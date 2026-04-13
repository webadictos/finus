export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 w-48 rounded-lg bg-muted" />

      {/* Card row skeleton */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 flex flex-col gap-2">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-6 w-28 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Main content blocks */}
      <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
        <div className="h-4 w-36 rounded bg-muted" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
            <div className="h-8 w-16 rounded-lg bg-muted" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
        <div className="h-4 w-44 rounded bg-muted" />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
            <div className="h-8 w-16 rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
