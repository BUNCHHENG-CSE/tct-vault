import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Top Banner Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/70 p-6 space-y-3 bg-card/85">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-36 rounded-lg" />
            <Skeleton className="h-3 w-44 rounded-md" />
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4 rounded-2xl border border-border/70 p-6 space-y-4 bg-card/85">
          <Skeleton className="h-6 w-44 rounded-lg" />
          <Skeleton className="h-[280px] w-full rounded-xl" />
        </div>
        <div className="lg:col-span-3 rounded-2xl border border-border/70 p-6 space-y-4 bg-card/85">
          <Skeleton className="h-6 w-40 rounded-lg" />
          <Skeleton className="h-[280px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
