// ── Car registration campaign domain types ───────────────────────────
// Mirrors the enums and tables created in
// supabase/migrations/20261122120000_car_registration_campaigns.sql

export type CampaignType =
  | "IMMEDIATE_SALE"
  | "EXTRAORDINARY_SALE"
  | "PRE_SALE"
  | "OTHER";

export type CampaignStatus =
  | "DRAFT"
  | "UPCOMING"
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "ARCHIVED";

export type ConditionType =
  | "MIN_AGE"
  | "DRIVING_LICENSE"
  | "ACTIVE_PLATE_RESTRICTION"
  | "PREVIOUS_PURCHASE_RESTRICTION"
  | "BANK_ACCOUNT"
  | "PROXY_ACCOUNT"
  | "BLOCKED_FUNDS"
  | "MOTHERS_PLAN"
  | "SCRAPPAGE"
  | "OTHER";

export type RequirementStatus = "REQUIRED" | "NOT_REQUIRED" | "UNSPECIFIED";

export type PricingType = "FIXED" | "TBD";

export type CommentStatus = "PENDING" | "APPROVED" | "REJECTED" | "DELETED";

export type AnalyticsEvent =
  | "VIEW"
  | "REGISTRATION_CLICK"
  | "FAVORITE"
  | "POLL_VOTE";

// ── Reference entities ───────────────────────────────────────────────

export interface Manufacturer {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  registration_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleModel {
  id: string;
  manufacturer_id: string;
  name: string;
  slug: string;
  trim: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApplicantCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Campaign children ────────────────────────────────────────────────

export interface CampaignVehicle {
  id: string;
  campaign_id: string;
  vehicle_model_id: string | null;
  display_name: string | null;
  official_price: number | null;
  initial_payment: number | null;
  pricing_type: PricingType;
  delivery_description: string | null;
  delivery_months: number | null;
  available_colors: string[] | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  vehicle_model?: VehicleModel | null;
}

export interface CampaignCondition {
  id: string;
  campaign_id: string;
  condition_type: ConditionType;
  condition_value: Record<string, unknown> | null;
  requirement_status: RequirementStatus;
  description: string | null;
  official_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignAmendment {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  changes: Record<string, unknown> | null;
  official_source_url: string | null;
  document_url: string | null;
  published_at: string;
  created_at: string;
}

export interface CampaignFaq {
  id: string;
  campaign_id: string;
  question: string;
  answer: string;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignGuide {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  external_url: string | null;
  step_order: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignPoll {
  id: string;
  campaign_id: string;
  question: string;
  options: { id: string; label: string }[];
  is_active: boolean;
  created_at: string;
}

// ── Campaign ─────────────────────────────────────────────────────────

export interface RegistrationCampaign {
  id: string;
  manufacturer_id: string | null;
  title: string;
  slug: string;
  announcement_number: string | null;
  description: string | null;
  campaign_type: CampaignType;
  status: CampaignStatus;
  published_at: string | null;
  registration_starts_at: string | null;
  registration_ends_at: string | null;
  official_registration_url: string | null;
  official_document_url: string | null;
  source_url: string | null;
  last_verified_at: string | null;
  min_initial_payment: number | null;
  min_delivery_months: number | null;
  vehicle_count: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignListVehicle = Pick<
  CampaignVehicle,
  | "id"
  | "display_name"
  | "official_price"
  | "initial_payment"
  | "pricing_type"
  | "delivery_description"
  | "delivery_months"
  | "sort_order"
> & {
  vehicle_model: Pick<
    VehicleModel,
    "id" | "name" | "trim" | "image_url"
  > | null;
};

/** A campaign row plus the embeds used by the directory cards. */
export interface CampaignListItem extends RegistrationCampaign {
  manufacturer: Pick<Manufacturer, "id" | "name" | "slug" | "logo_url"> | null;
  vehicles: CampaignListVehicle[];
}

/** Fully-hydrated campaign for the detail page. */
export interface CampaignDetail extends RegistrationCampaign {
  manufacturer: Manufacturer | null;
  vehicles: CampaignVehicle[];
  conditions: CampaignCondition[];
  applicant_categories: ApplicantCategory[];
  faqs: CampaignFaq[];
  guides: CampaignGuide[];
  amendments: CampaignAmendment[];
}

// ── Directory query shapes ───────────────────────────────────────────

export type CampaignSort =
  | "newest"
  | "deadline"
  | "lowest_payment"
  | "shortest_delivery";

export interface CampaignFilter {
  search?: string;
  status?: CampaignStatus[];
  type?: CampaignType[];
  manufacturerId?: string;
  applicantCategoryId?: string;
  vehicleModelId?: string;
  paymentMin?: number;
  paymentMax?: number;
  maxDeliveryMonths?: number;
  sort?: CampaignSort;
  page?: number;
  pageSize?: number;
  /** Include DRAFT/ARCHIVED rows (staff/admin views only). */
  includeHidden?: boolean;
}

export interface CampaignStats {
  total: number;
  active: number;
  upcoming: number;
  expired: number;
  cancelled: number;
}
