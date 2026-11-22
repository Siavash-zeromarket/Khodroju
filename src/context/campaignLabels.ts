import type {
  CampaignStatus,
  CampaignType,
  ConditionType,
  RequirementStatus,
  PricingType,
  CampaignSort,
} from "@/types/campaigns";

/** Persian digit helper for values that carry no separators (years, counts). */
export function toFa(value: number | string): string {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export const campaignStatusLabels: Record<CampaignStatus, string> = {
  DRAFT: "پیش‌نویس",
  UPCOMING: "به‌زودی",
  ACTIVE: "در حال ثبت‌نام",
  EXPIRED: "پایان‌یافته",
  CANCELLED: "لغو شده",
  ARCHIVED: "بایگانی",
};

/** Maps a campaign status to the shared `.status-*` utility class. */
export const campaignStatusClass: Record<CampaignStatus, string> = {
  DRAFT: "status-pending",
  UPCOMING: "status-reserved",
  ACTIVE: "status-active",
  EXPIRED: "status-sold",
  CANCELLED: "status-sold",
  ARCHIVED: "status-pending",
};

export const campaignTypeLabels: Record<CampaignType, string> = {
  IMMEDIATE_SALE: "فروش فوری",
  EXTRAORDINARY_SALE: "فروش فوق‌العاده",
  PRE_SALE: "پیش‌فروش",
  OTHER: "سایر",
};

export const conditionTypeLabels: Record<ConditionType, string> = {
  MIN_AGE: "حداقل سن",
  DRIVING_LICENSE: "گواهینامه رانندگی",
  ACTIVE_PLATE_RESTRICTION: "محدودیت پلاک فعال",
  PREVIOUS_PURCHASE_RESTRICTION: "محدودیت خرید قبلی خودرو",
  BANK_ACCOUNT: "حساب بانکی",
  PROXY_ACCOUNT: "حساب وکالتی",
  BLOCKED_FUNDS: "بلوکه شدن وجه",
  MOTHERS_PLAN: "طرح مادران",
  SCRAPPAGE: "طرح خودروهای فرسوده",
  OTHER: "سایر شرایط",
};

export const requirementStatusLabels: Record<RequirementStatus, string> = {
  REQUIRED: "الزامی",
  NOT_REQUIRED: "الزامی نیست",
  UNSPECIFIED: "نامشخص",
};

export const requirementStatusClass: Record<RequirementStatus, string> = {
  REQUIRED: "status-active",
  NOT_REQUIRED: "status-sold",
  UNSPECIFIED: "status-pending",
};

export const pricingTypeLabels: Record<PricingType, string> = {
  FIXED: "قیمت ثابت",
  TBD: "قیمت متعاقباً اعلام می‌شود",
};

export const campaignSortLabels: Record<CampaignSort, string> = {
  newest: "تازه‌ترین",
  deadline: "نزدیک‌ترین مهلت ثبت‌نام",
  lowest_payment: "کمترین پیش‌پرداخت",
  shortest_delivery: "کوتاه‌ترین زمان تحویل",
};

/** Persian (Jalali) date without time, e.g. "۱۵ آذر ۱۴۰۵". */
export function formatCampaignDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

/** Delivery label from months count or a free-text description. */
export function deliveryLabel(
  months: number | null | undefined,
  description?: string | null,
): string {
  if (description?.trim()) return description;
  if (months != null) return `${toFa(months)} ماه`;
  return "اعلام نشده";
}
