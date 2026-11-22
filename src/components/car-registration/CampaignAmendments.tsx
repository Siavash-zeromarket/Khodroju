import { ExternalLink, FileClock } from "lucide-react";
import { formatCampaignDate } from "@/context/campaignLabels";
import type { CampaignAmendment } from "@/types/campaigns";
import DetailSection from "./DetailSection";

function ChangesTable({ changes }: { changes: Record<string, unknown> }) {
  const entries = Object.entries(changes).filter(
    ([, v]) => v !== null && v !== undefined,
  );
  if (!entries.length) return null;

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-border">
      <table className="w-full text-2xs">
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b border-border last:border-0">
              <td className="w-1/3 bg-muted px-2 py-1.5 font-600 text-muted-foreground">
                {key}
              </td>
              <td className="px-2 py-1.5 text-foreground">
                {typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CampaignAmendments({
  amendments,
}: {
  amendments: CampaignAmendment[];
}) {
  if (!amendments.length) return null;

  return (
    <DetailSection
      icon={<FileClock size={18} />}
      title="اصلاحیه‌ها و به‌روزرسانی‌های رسمی"
      description="تاریخچه تغییرات مهم طرح حفظ می‌شود تا اطلاعات پیشین پنهان نشود."
    >
      <ol className="space-y-4 border-r-2 border-border pr-4">
        {amendments.map((a) => (
          <li key={a.id} className="relative">
            <span className="absolute -right-[21px] top-1 size-3 rounded-full border-2 border-card bg-primary" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-700 text-foreground">
                {a.title}
              </span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-2xs text-muted-foreground">
                {formatCampaignDate(a.published_at)}
              </span>
            </div>
            {a.description && (
              <p className="mt-1 text-2xs leading-6 text-muted-foreground">
                {a.description}
              </p>
            )}
            {a.changes && <ChangesTable changes={a.changes} />}
            <div className="mt-2 flex flex-wrap gap-3">
              {a.official_source_url && (
                <a
                  href={a.official_source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-2xs font-600 text-primary hover:underline"
                >
                  <ExternalLink size={12} />
                  منبع رسمی
                </a>
              )}
              {a.document_url && (
                <a
                  href={a.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-2xs font-600 text-primary hover:underline"
                >
                  <ExternalLink size={12} />
                  سند اصلاحیه
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </DetailSection>
  );
}
