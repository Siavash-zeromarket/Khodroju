import { ExternalLink, FileText, Globe, Link2 } from "lucide-react";
import type { CampaignDetail } from "@/types/campaigns";
import DetailSection from "./DetailSection";

function LinkRow({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted"
    >
      <span className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span>
          <span className="block text-sm font-600 text-foreground">
            {label}
          </span>
          <span className="block text-2xs text-muted-foreground">{hint}</span>
        </span>
      </span>
      <ExternalLink size={15} className="shrink-0 text-muted-foreground" />
    </a>
  );
}

export default function CampaignOfficialLinks({
  campaign,
}: {
  campaign: CampaignDetail;
}) {
  const hasLinks =
    campaign.official_registration_url ||
    campaign.official_document_url ||
    campaign.source_url;
  if (!hasLinks) return null;

  return (
    <DetailSection
      icon={<Link2 size={18} />}
      title="منابع و پیوندهای رسمی"
      description="این پیوندها مستقیماً به منابع اعلام‌شده توسط خودروساز اشاره دارند."
    >
      <div className="space-y-2">
        {campaign.official_registration_url && (
          <LinkRow
            href={campaign.official_registration_url}
            icon={<Globe size={16} />}
            label="درگاه رسمی ثبت‌نام"
            hint="سامانه رسمی ثبت‌نام خودروساز"
          />
        )}
        {campaign.official_document_url && (
          <LinkRow
            href={campaign.official_document_url}
            icon={<FileText size={16} />}
            label="متن رسمی بخشنامه (PDF)"
            hint="سند رسمی طرح"
          />
        )}
        {campaign.source_url && (
          <LinkRow
            href={campaign.source_url}
            icon={<ExternalLink size={16} />}
            label="منبع رسمی اطلاعیه"
            hint="خبر یا صفحه رسمی خودروساز"
          />
        )}
      </div>
    </DetailSection>
  );
}
