import { Skeleton } from "@/components/ui/feedback";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading pipeline">
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-96 max-w-full" />
        <Skeleton className="h-4 w-[520px] max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <Skeleton className="h-7 w-80" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-line px-5 py-4 last:border-0">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-14" />
            <Skeleton className="hidden h-5 w-28 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
