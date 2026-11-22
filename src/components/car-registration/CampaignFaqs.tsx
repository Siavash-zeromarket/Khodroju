import { ChevronDown, HelpCircle } from "lucide-react";
import type { CampaignFaq } from "@/types/campaigns";
import DetailSection from "./DetailSection";

export default function CampaignFaqs({ faqs }: { faqs: CampaignFaq[] }) {
  if (!faqs.length) return null;

  return (
    <DetailSection icon={<HelpCircle size={18} />} title="پرسش‌های متداول">
      <div className="space-y-2">
        {faqs.map((faq) => (
          <details
            key={faq.id}
            className="group rounded-xl border border-border p-3 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-600 text-foreground">
              {faq.question}
              <ChevronDown
                size={16}
                className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-2 text-2xs leading-6 text-muted-foreground">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </DetailSection>
  );
}
