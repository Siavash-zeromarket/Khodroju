import { ExternalLink, ListOrdered } from "lucide-react";
import { toFa } from "@/context/campaignLabels";
import type { CampaignGuide } from "@/types/campaigns";
import DetailSection from "./DetailSection";

export default function CampaignGuides({
  guides,
}: {
  guides: CampaignGuide[];
}) {
  if (!guides.length) return null;

  return (
    <DetailSection
      icon={<ListOrdered size={18} />}
      title="راهنمای گام‌به‌گام ثبت‌نام"
    >
      <ol className="space-y-3">
        {guides.map((g, i) => (
          <li key={g.id} className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xs font-700 text-primary">
              {toFa(i + 1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-600 text-foreground">{g.title}</div>
              {g.description && (
                <p className="mt-1 text-2xs leading-6 text-muted-foreground">
                  {g.description}
                </p>
              )}
              {g.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={g.image_url}
                  alt={g.title}
                  className="mt-2 max-h-56 w-full rounded-lg border border-border object-contain"
                  loading="lazy"
                />
              )}
              {g.external_url && (
                <a
                  href={g.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-2xs font-600 text-primary hover:underline"
                >
                  <ExternalLink size={12} />
                  مشاهده پیوند مرتبط
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </DetailSection>
  );
}
