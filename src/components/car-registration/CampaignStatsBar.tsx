import { CalendarClock, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toFa } from "@/context/campaignLabels";
import type { CampaignStats } from "@/types/campaigns";

const items = [
  {
    key: "active" as const,
    label: "در حال ثبت‌نام",
    icon: CheckCircle2,
    className: "text-success",
    bg: "bg-success/10",
  },
  {
    key: "upcoming" as const,
    label: "به‌زودی",
    icon: Clock,
    className: "text-primary",
    bg: "bg-primary/10",
  },
  {
    key: "expired" as const,
    label: "پایان‌یافته",
    icon: CalendarClock,
    className: "text-muted-foreground",
    bg: "bg-muted",
  },
  {
    key: "cancelled" as const,
    label: "لغو شده",
    icon: XCircle,
    className: "text-danger",
    bg: "bg-danger/10",
  },
];

export default function CampaignStatsBar({ stats }: { stats: CampaignStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ key, label, icon: Icon, className, bg }) => (
        <div key={key} className="card-elevated flex items-center gap-3 p-4">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${bg} ${className}`}
          >
            <Icon size={18} />
          </div>
          <div>
            <div className="stat-value text-lg font-800 text-foreground">
              {toFa(stats[key])}
            </div>
            <div className="text-2xs text-muted-foreground">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
