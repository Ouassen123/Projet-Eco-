import { LucideIcon, Inbox } from "lucide-react";

export function EmptyState({
  icone: Icone = Inbox,
  titre,
  description,
  action,
}: {
  icone?: LucideIcon;
  titre: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-pink-200 bg-gradient-to-b from-white to-pink-50 px-6 py-16 text-center shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 shadow-lg shadow-pink-950/15">
        <Icone size={24} className="text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{titre}</p>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
