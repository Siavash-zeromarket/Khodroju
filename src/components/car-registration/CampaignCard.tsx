import Link from "next/link";
import {
  Building2,
  CalendarClock,
  CalendarPlus,
  ChevronLeft,
  Truck,
  Wallet,
} from "lucide-react";
import { formatPrice } from "@/context/data";
import {
  campaignStatusClass,
  campaignStatusLabels,
  campaignTypeLabels,
  deliveryLabel,
  formatCampaignDate,
  toFa,
} from "@/context/campaignLabels";
import type { CampaignListItem } from "@/types/campaigns";

function StatusPill({ status }: { status: CampaignListItem["status"] }) {
  return (
    <span
      className={`${campaignStatusClass[status]} inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-2xs font-600`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {campaignStatusLabels[status]}
    </span>
  );
}

function TypePill({ type }: { type: CampaignListItem["campaign_type"] }) {
  return (
    <span className="inline-flex items-center rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-2xs font-600 text-primary">
      {campaignTypeLabels[type]}
    </span>
  );
}

export default function CampaignCard({
  campaign,
}: {
  campaign: CampaignListItem;
}) {
  const models = campaign.vehicles
    .map((v) => v.vehicle_model?.name ?? v.display_name ?? "")
    .filter(Boolean);
  const uniqueModels = [...new Set(models)];

  return (
    <Link
      href={`/car-registration/${campaign.slug}`}
      className="card-elevated card-hover flex flex-col gap-3 p-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
            {campaign.manufacturer?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={campaign.manufacturer.logo_url}
                alt={campaign.manufacturer.name}
                className="size-full object-contain"
                loading="lazy"
              />
            ) : (
              <Building2 size={20} />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-700 text-foreground">
              {campaign.manufacturer?.name ?? "سازنده نامشخص"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {campaign.title}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusPill status={campaign.status} />
          <TypePill type={campaign.campaign_type} />
        </div>
      </div>

      {/* Vehicles */}
      {uniqueModels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {uniqueModels.slice(0, 3).map((name) => (
            <span
              key={name}
              className="rounded-md bg-muted px-2 py-1 text-2xs text-muted-foreground"
            >
              {name}
            </span>
          ))}
          {uniqueModels.length > 3 && (
            <span className="rounded-md bg-muted px-2 py-1 text-2xs text-muted-foreground">
              +{toFa(uniqueModels.length - 3)} مدل
            </span>
          )}
        </div>
      )}

      {/* Key figures */}
      <div className="grid grid-cols-2 gap-2 text-2xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Wallet size={13} className="text-primary" />
          <span>
            پیش‌پرداخت:{" "}
            <span className="font-600 text-foreground">
              {campaign.min_initial_payment != null
                ? `${formatPrice(campaign.min_initial_payment)} تومان`
                : "اعلام نشده"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Truck size={13} className="text-accent" />
          <span>تحویل: {deliveryLabel(campaign.min_delivery_months)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarPlus size={13} className="text-success" />
          <span>
            شروع: {formatCampaignDate(campaign.registration_starts_at)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarClock size={13} className="text-warning" />
          <span>مهلت: {formatCampaignDate(campaign.registration_ends_at)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-border pt-2 text-2xs text-muted-foreground">
        <span>آخرین بروزرسانی: {formatCampaignDate(campaign.updated_at)}</span>
        <span className="flex items-center gap-0.5 font-600 text-primary">
          جزئیات
          <ChevronLeft size={13} />
        </span>
      </div>
    </Link>
  );
}
