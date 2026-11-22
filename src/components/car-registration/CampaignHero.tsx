import Link from "next/link";
import {
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  ChevronLeft,
  ExternalLink,
  FileBadge,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  campaignStatusClass,
  campaignStatusLabels,
  campaignTypeLabels,
  formatCampaignDate,
  toFa,
} from "@/context/campaignLabels";
import type { CampaignDetail } from "@/types/campaigns";
import ShareCampaignButton from "./ShareCampaignButton";

function Meta({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <div className="text-2xs text-muted-foreground">{label}</div>
        <div className="text-sm font-600 text-foreground">{value}</div>
      </div>
    </div>
  );
}

export default function CampaignHero({
  campaign,
}: {
  campaign: CampaignDetail;
}) {
  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-2xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          خانه
        </Link>
        <ChevronLeft size={12} />
        <Link href="/car-registration" className="hover:text-primary">
          طرح‌های ثبت‌نام
        </Link>
        <ChevronLeft size={12} />
        <span className="truncate text-foreground">{campaign.title}</span>
      </nav>

      <div className="card-elevated p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary">
              {campaign.manufacturer?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={campaign.manufacturer.logo_url}
                  alt={campaign.manufacturer.name}
                  className="size-full object-contain"
                />
              ) : (
                <Building2 size={24} />
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                {campaign.manufacturer?.name ?? "سازنده نامشخص"}
              </div>
              <h1 className="mt-1 text-xl font-800 text-foreground sm:text-2xl">
                {campaign.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`${campaignStatusClass[campaign.status]} inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-2xs font-600`}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {campaignStatusLabels[campaign.status]}
                </span>
                <span className="inline-flex items-center rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-2xs font-600 text-primary">
                  {campaignTypeLabels[campaign.campaign_type]}
                </span>
                {campaign.announcement_number && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-2xs text-muted-foreground">
                    <FileBadge size={11} />
                    بخشنامه {campaign.announcement_number}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ShareCampaignButton title={campaign.title} />
            {campaign.official_registration_url && (
              <a
                href={campaign.official_registration_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm"
              >
                <ExternalLink size={15} />
                درگاه رسمی ثبت‌نام
              </a>
            )}
          </div>
        </div>

        {campaign.description && (
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {campaign.description}
          </p>
        )}

        {/* Key dates / meta */}
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Meta
            icon={<CalendarCheck size={16} />}
            label="تاریخ انتشار"
            value={formatCampaignDate(campaign.published_at)}
          />
          <Meta
            icon={<CalendarPlus size={16} />}
            label="شروع ثبت‌نام"
            value={formatCampaignDate(campaign.registration_starts_at)}
          />
          <Meta
            icon={<CalendarClock size={16} />}
            label="مهلت ثبت‌نام"
            value={formatCampaignDate(campaign.registration_ends_at)}
          />
          <Meta
            icon={<ShieldCheck size={16} />}
            label="آخرین اعتبارسنجی"
            value={formatCampaignDate(campaign.last_verified_at)}
          />
        </div>

        {campaign.applicant_categories.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <span className="flex items-center gap-1 text-2xs text-muted-foreground">
              <Users size={13} />
              گروه‌های متقاضی:
            </span>
            {campaign.applicant_categories.map((c) => (
              <span
                key={c.id}
                className="rounded-md bg-muted px-2 py-1 text-2xs text-foreground"
              >
                {c.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 text-2xs text-muted-foreground">
          {toFa(campaign.vehicle_count)} خودرو در این طرح · آخرین بروزرسانی:{" "}
          {formatCampaignDate(campaign.updated_at)}
        </div>
      </div>
    </div>
  );
}
