import { CalendarClock, Info, Truck, Wallet } from "lucide-react";
import { formatPrice } from "@/context/data";
import { deliveryLabel, formatCampaignDate } from "@/context/campaignLabels";
import type { CampaignDetail as CampaignDetailType } from "@/types/campaigns";
import CampaignHero from "./CampaignHero";
import CampaignVehiclesSection from "./CampaignVehiclesSection";
import CampaignConditionsSection from "./CampaignConditionsSection";
import CampaignGuides from "./CampaignGuides";
import CampaignFaqs from "./CampaignFaqs";
import CampaignAmendments from "./CampaignAmendments";
import CampaignOfficialLinks from "./CampaignOfficialLinks";

export default function CampaignDetail({
  campaign,
}: {
  campaign: CampaignDetailType;
}) {
  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 lg:px-8 xl:px-10">
      <CampaignHero campaign={campaign} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <CampaignVehiclesSection vehicles={campaign.vehicles} />
          <CampaignConditionsSection conditions={campaign.conditions} />
          <CampaignGuides guides={campaign.guides} />
          <CampaignFaqs faqs={campaign.faqs} />
          <CampaignAmendments amendments={campaign.amendments} />
        </div>

        {/* Aside */}
        <aside className="space-y-6">
          <div className="card-elevated p-5">
            <h2 className="mb-4 text-base font-700 text-foreground">
              خلاصه طرح
            </h2>
            <dl className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Wallet size={14} className="text-primary" />
                  کمترین پیش‌پرداخت
                </dt>
                <dd className="font-600 text-foreground">
                  {campaign.min_initial_payment != null
                    ? `${formatPrice(campaign.min_initial_payment)} تومان`
                    : "اعلام نشده"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Truck size={14} className="text-accent" />
                  کوتاه‌ترین تحویل
                </dt>
                <dd className="font-600 text-foreground">
                  {deliveryLabel(campaign.min_delivery_months)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarClock size={14} className="text-warning" />
                  مهلت ثبت‌نام
                </dt>
                <dd className="font-600 text-foreground">
                  {formatCampaignDate(campaign.registration_ends_at)}
                </dd>
              </div>
            </dl>
          </div>

          <CampaignOfficialLinks campaign={campaign} />

          <div className="card-elevated p-5">
            <p className="flex items-start gap-1.5 text-2xs leading-6 text-muted-foreground">
              <Info size={14} className="mt-0.5 shrink-0 text-primary" />
              اطلاعات این صفحه جنبه اطلاع‌رسانی دارد. ثبت‌نام و تأیید نهایی تنها
              از طریق درگاه رسمی خودروساز انجام می‌شود.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
