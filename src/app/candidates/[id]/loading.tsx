import { Skeleton } from "@/components/ui/feedback";

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading candidate">
      <Skeleton className="h-4 w-20" />
      <div className="flex items-center gap-5 rounded-xl border border-line bg-surface p-6">
        <Skeleton className="size-28 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="hidden gap-2 lg:flex">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {[140, 320, 260].map((height) => (
            <div key={height} className="rounded-xl border border-line bg-surface p-5" style={{ height }}>
              <Skeleton className="h-4 w-48" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-5">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
