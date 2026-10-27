export function PageHeader({
  titre,
  description,
  actions,
}: {
  titre: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm shadow-pink-950/5 backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 via-violet-500 to-sky-500" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 inline-flex rounded-full bg-pink-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-pink-700">
            Service Économique
          </p>
          <h1 className="bg-gradient-to-r from-slate-900 via-pink-900 to-violet-900 bg-clip-text text-xl font-semibold text-transparent sm:text-2xl">
            {titre}
          </h1>
          {description && <p className="mt-1.5 max-w-3xl text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
