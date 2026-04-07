import { Sun } from "lucide-react";

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface-100 border border-surface-200/60 flex items-center justify-center mb-4 text-emerald-500">
        {icon ?? <Sun className="w-7 h-7" />}
      </div>
      <h3 className="text-slate-200 font-semibold text-lg mb-2">{title}</h3>
      {description && <p className="text-slate-500 text-sm max-w-xs mb-6">{description}</p>}
      {action}
    </div>
  );
}
