import { ClipboardCheck, Info } from "lucide-react";
import {
  conditionTypeLabels,
  requirementStatusClass,
  requirementStatusLabels,
} from "@/context/campaignLabels";
import type { CampaignCondition } from "@/types/campaigns";
import DetailSection from "./DetailSection";

function conditionValueText(
  value: Record<string, unknown> | null,
): string | null {
  if (!value) return null;
  const entries = Object.entries(value).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  if (!entries.length) return null;
  return entries.map(([k, v]) => `${k}: ${String(v)}`).join(" · ");
}

export default function CampaignConditionsSection({
  conditions,
}: {
  conditions: CampaignCondition[];
}) {
  if (!conditions.length) return null;

  return (
    <DetailSection
      icon={<ClipboardCheck size={18} />}
      title="شرایط ثبت‌نام"
      description="این شرایط مختص همین طرح است و ممکن است با سایر بخشنامه‌ها متفاوت باشد."
    >
      <ul className="space-y-2">
        {conditions.map((c) => {
          const valueText = conditionValueText(c.condition_value);
          return (
            <li
              key={c.id}
              className="flex flex-col gap-1.5 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="text-sm font-600 text-foreground">
                  {conditionTypeLabels[c.condition_type]}
                  {valueText && (
                    <span className="mr-2 text-2xs font-400 text-muted-foreground">
                      ({valueText})
                    </span>
                  )}
                </div>
                {c.description && (
                  <p className="mt-1 text-2xs leading-6 text-muted-foreground">
                    {c.description}
                  </p>
                )}
                {c.official_reference && (
                  <p className="mt-1 text-2xs text-muted-foreground">
                    مرجع: {c.official_reference}
                  </p>
                )}
              </div>
              <span
                className={`${requirementStatusClass[c.requirement_status]} inline-flex shrink-0 items-center rounded-md px-2 py-1 text-2xs font-600`}
              >
                {requirementStatusLabels[c.requirement_status]}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 flex items-start gap-1.5 rounded-lg bg-warning/10 p-3 text-2xs leading-6 text-muted-foreground">
        <Info size={14} className="mt-0.5 shrink-0 text-warning" />
        وضعیت «نامشخص» به‌معنای عدم اعلام شرط توسط خودروساز است و مبنای تصمیم
        قطعی قرار نمی‌گیرد.
      </p>
    </DetailSection>
  );
}
