import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: number | string;
  sub: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

export const StatsCard = ({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  iconBg,
}: StatsCardProps) => {
  return (
    <div className="rounded-xl p-4 bg-white/[0.03] border border-white/5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-white/40 text-xs font-medium">{label}</span>
        <span className={cn("p-1.5 rounded-lg border", iconBg)}>
          <Icon size={14} className={iconColor} />
        </span>
      </div>
      <div>
        <p className="text-white text-xl font-bold tracking-tight">{value}</p>
        <p className="text-white/30 text-xs mt-0.5">{sub}</p>
      </div>
    </div>
  );
};
