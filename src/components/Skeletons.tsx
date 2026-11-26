import React from 'react';

export function NoticesSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[1, 2, 3].map((idx) => (
        <div
          key={idx}
          className="bg-white/85 backdrop-blur-sm border border-slate-200/90 rounded-xl p-6 animate-pulse space-y-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-slate-200/80 rounded w-44" />
              <div className="h-5 bg-slate-200 rounded w-3/5" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-8 w-8 bg-slate-100 rounded-lg" />
              <div className="h-8 w-36 bg-slate-100 rounded-lg" />
            </div>
          </div>
          <div className="space-y-2 pt-1">
            <div className="h-3.5 bg-slate-100 rounded w-full" />
            <div className="h-3.5 bg-slate-100 rounded w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RoutinesSkeleton() {
  return (
    <div className="divide-y divide-slate-200/80" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((idx) => (
        <div
          key={idx}
          className="px-4 py-3.5 grid grid-cols-12 gap-3 items-center animate-pulse"
        >
          <div className="col-span-2 h-4 bg-slate-200/80 rounded w-20" />
          <div className="col-span-3 h-4 bg-slate-100 rounded w-32" />
          <div className="col-span-3 h-4 bg-slate-200 rounded w-40" />
          <div className="col-span-2 h-4 bg-slate-100 rounded w-24" />
          <div className="col-span-2 h-4 bg-slate-100 rounded w-16 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function NotesSkeleton() {
  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start" aria-hidden="true">
      <div className="lg:col-span-4 bg-white/85 border border-slate-200/90 rounded-xl p-4 space-y-4 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-32" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="pt-3 border-t border-slate-100 space-y-2">
            <div className="h-4 bg-slate-200/80 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white/85 border border-slate-200/90 rounded-xl p-5 h-80 animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-60 bg-slate-100 rounded-lg w-full" />
        </div>
      </div>
    </div>
  );
}

export function CardsGridSkeleton() {
  return (
    <div className="grid md:grid-cols-2 gap-4" aria-hidden="true">
      {[1, 2, 3, 4].map((idx) => (
        <div
          key={idx}
          className="bg-white/85 backdrop-blur-sm border border-slate-200/90 rounded-xl p-5 space-y-3 animate-pulse"
        >
          <div className="h-3 bg-slate-200/80 rounded w-28" />
          <div className="h-5 bg-slate-200 rounded w-2/3" />
          <div className="h-10 bg-slate-100 rounded w-full" />
          <div className="pt-3 border-t border-slate-100 h-3 bg-slate-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
