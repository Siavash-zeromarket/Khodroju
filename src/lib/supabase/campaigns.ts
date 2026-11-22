import { supabase } from "./client";
import type {
  AnalyticsEvent,
  ApplicantCategory,
  CampaignDetail,
  CampaignFilter,
  CampaignListItem,
  CampaignStats,
  Manufacturer,
  VehicleModel,
} from "@/types/campaigns";

/** Statuses that are visible to the public directory. */
const PUBLIC_STATUSES = ["UPCOMING", "ACTIVE", "EXPIRED", "CANCELLED"] as const;

const LIST_SELECT = `
  id, manufacturer_id, title, slug, announcement_number, description,
  campaign_type, status, published_at, registration_starts_at, registration_ends_at,
  official_registration_url, official_document_url, source_url, last_verified_at,
  min_initial_payment, min_delivery_months, vehicle_count,
  created_by, updated_by, created_at, updated_at,
  manufacturer:manufacturers(id, name, slug, logo_url),
  vehicles:campaign_vehicles(
    id, display_name, official_price, initial_payment, pricing_type,
    delivery_description, delivery_months, sort_order,
    vehicle_model:vehicle_models(id, name, trim, image_url)
  )
`;

const DETAIL_SELECT = `
  *,
  manufacturer:manufacturers(*),
  vehicles:campaign_vehicles(*, vehicle_model:vehicle_models(*)),
  conditions:campaign_conditions(*),
  applicant_categories:campaign_applicant_categories(applicant_category:applicant_categories(*)),
  faqs:campaign_faqs(*),
  guides:campaign_registration_guides(*),
  amendments:campaign_amendments(*)
`;

/** Campaign ids whose vehicles match a free-text search (display name / model). */
async function campaignIdsForVehicleSearch(search: string): Promise<string[]> {
  const { data: models } = await supabase
    .from("vehicle_models")
    .select("id")
    .ilike("name", `%${search}%`)
    .limit(200);

  const modelIds = (models ?? []).map((m: { id: string }) => m.id);

  let query = supabase.from("campaign_vehicles").select("campaign_id");
  if (modelIds.length) {
    query = query.or(
      `display_name.ilike.%${search}%,vehicle_model_id.in.(${modelIds.join(",")})`,
    );
  } else {
    query = query.ilike("display_name", `%${search}%`);
  }

  const { data } = await query.limit(500);
  const ids = ((data ?? []) as Array<{ campaign_id: string }>).map(
    (r) => r.campaign_id,
  );
  return Array.from(new Set(ids));
}

/** Campaign ids matching an applicant category. */
async function campaignIdsForCategory(categoryId: string): Promise<string[]> {
  const { data } = await supabase
    .from("campaign_applicant_categories")
    .select("campaign_id")
    .eq("applicant_category_id", categoryId)
    .limit(1000);
  return (data ?? []).map((r: { campaign_id: string }) => r.campaign_id);
}

/** Campaign ids containing a specific vehicle model. */
async function campaignIdsForModel(modelId: string): Promise<string[]> {
  const { data } = await supabase
    .from("campaign_vehicles")
    .select("campaign_id")
    .eq("vehicle_model_id", modelId)
    .limit(1000);
  const ids = ((data ?? []) as Array<{ campaign_id: string }>).map(
    (r) => r.campaign_id,
  );
  return Array.from(new Set(ids));
}

/** Manufacturer ids whose name/slug match the search. */
async function manufacturerIdsForSearch(search: string): Promise<string[]> {
  const { data } = await supabase
    .from("manufacturers")
    .select("id")
    .or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
    .limit(100);
  return (data ?? []).map((m: { id: string }) => m.id);
}

/**
 * Fetch the paginated campaign directory. All filtering/sorting/pagination is
 * done by the database — filter combinations never produce indexable pages.
 */
export async function fetchCampaigns(
  filter: CampaignFilter = {},
): Promise<{ items: CampaignListItem[]; total: number }> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, filter.pageSize ?? 12));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("registration_campaigns")
    .select(LIST_SELECT, { count: "exact" });

  // Visibility
  if (!filter.includeHidden) {
    query = query.in(
      "status",
      filter.status ?? (PUBLIC_STATUSES as unknown as string[]),
    );
  } else if (filter.status?.length) {
    query = query.in("status", filter.status);
  }

  if (filter.type?.length) query = query.in("campaign_type", filter.type);
  if (filter.manufacturerId)
    query = query.eq("manufacturer_id", filter.manufacturerId);
  if (filter.paymentMin !== undefined) {
    query = query.gte("min_initial_payment", filter.paymentMin);
  }
  if (filter.paymentMax !== undefined) {
    query = query.lte("min_initial_payment", filter.paymentMax);
  }
  if (filter.maxDeliveryMonths !== undefined) {
    query = query.lte("min_delivery_months", filter.maxDeliveryMonths);
  }

  // Collect id-based constraints (each is an AND group).
  const idGroups: string[][] = [];
  if (filter.applicantCategoryId) {
    idGroups.push(await campaignIdsForCategory(filter.applicantCategoryId));
  }
  if (filter.vehicleModelId) {
    idGroups.push(await campaignIdsForModel(filter.vehicleModelId));
  }

  const search = filter.search?.trim();
  if (search) {
    const [manufacturerIds, vehicleCampaignIds] = await Promise.all([
      manufacturerIdsForSearch(search),
      campaignIdsForVehicleSearch(search),
    ]);
    const orParts = [
      `title.ilike.%${search}%`,
      `announcement_number.ilike.%${search}%`,
    ];
    if (manufacturerIds.length)
      orParts.push(`manufacturer_id.in.(${manufacturerIds.join(",")})`);
    if (vehicleCampaignIds.length)
      orParts.push(`id.in.(${vehicleCampaignIds.join(",")})`);
    query = query.or(orParts.join(","));
  }

  for (const ids of idGroups) {
    if (!ids.length) {
      return { items: [], total: 0 };
    }
    query = query.in("id", ids);
  }

  switch (filter.sort) {
    case "deadline":
      query = query.order("registration_ends_at", {
        ascending: true,
        nullsFirst: false,
      });
      break;
    case "lowest_payment":
      query = query.order("min_initial_payment", {
        ascending: true,
        nullsFirst: false,
      });
      break;
    case "shortest_delivery":
      query = query.order("min_delivery_months", {
        ascending: true,
        nullsFirst: false,
      });
      break;
    case "newest":
    default:
      query = query
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
  }

  const { data, error, count } = await query
    .order("sort_order", {
      referencedTable: "campaign_vehicles",
      ascending: true,
    })
    .range(from, to);

  if (error) throw error;
  return {
    items: (data ?? []) as unknown as CampaignListItem[],
    total: count ?? 0,
  };
}

/** Aggregate counts for the directory header. */
export async function fetchCampaignStats(): Promise<CampaignStats> {
  const countFor = async (status: string) => {
    const { count } = await supabase
      .from("registration_campaigns")
      .select("*", { count: "exact", head: true })
      .eq("status", status);
    return count ?? 0;
  };

  const [active, upcoming, expired, cancelled] = await Promise.all([
    countFor("ACTIVE"),
    countFor("UPCOMING"),
    countFor("EXPIRED"),
    countFor("CANCELLED"),
  ]);

  return {
    active,
    upcoming,
    expired,
    cancelled,
    total: active + upcoming + expired + cancelled,
  };
}

/** Fetch a single campaign with all of its relations by slug. */
export async function fetchCampaignBySlug(
  slug: string,
): Promise<CampaignDetail | null> {
  const { data, error } = await supabase
    .from("registration_campaigns")
    .select(DETAIL_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as {
    vehicles?: CampaignDetail["vehicles"] | null;
    conditions?: CampaignDetail["conditions"] | null;
    faqs?: CampaignDetail["faqs"] | null;
    guides?: CampaignDetail["guides"] | null;
    amendments?: CampaignDetail["amendments"] | null;
    applicant_categories?: Array<{
      applicant_category: ApplicantCategory | null;
    }> | null;
  } & Omit<
    CampaignDetail,
    | "vehicles"
    | "conditions"
    | "faqs"
    | "guides"
    | "amendments"
    | "applicant_categories"
  >;

  return {
    ...row,
    vehicles: (row.vehicles ?? []).sort((a, b) => a.sort_order - b.sort_order),
    conditions: row.conditions ?? [],
    faqs: (row.faqs ?? []).sort((a, b) => a.display_order - b.display_order),
    guides: (row.guides ?? []).sort((a, b) => a.step_order - b.step_order),
    amendments: (row.amendments ?? []).sort(
      (a, b) => +new Date(b.published_at) - +new Date(a.published_at),
    ),
    applicant_categories: (row.applicant_categories ?? [])
      .map((c) => c.applicant_category)
      .filter((c): c is ApplicantCategory => Boolean(c)),
  };
}

/** Active manufacturers for the filter dropdown. */
export async function fetchManufacturers(): Promise<Manufacturer[]> {
  const { data, error } = await supabase
    .from("manufacturers")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Manufacturer[];
}

/** Active applicant categories for the filter dropdown. */
export async function fetchApplicantCategories(): Promise<ApplicantCategory[]> {
  const { data, error } = await supabase
    .from("applicant_categories")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as ApplicantCategory[];
}

/** Vehicle models for the filter dropdown, optionally scoped to a manufacturer. */
export async function fetchVehicleModels(
  manufacturerId?: string,
): Promise<VehicleModel[]> {
  let query = supabase.from("vehicle_models").select("*").eq("is_active", true);
  if (manufacturerId) query = query.eq("manufacturer_id", manufacturerId);
  const { data, error } = await query.order("name");
  if (error) throw error;
  return (data ?? []) as VehicleModel[];
}

/**
 * Record a lightweight analytics event. Fire-and-forget — failures are
 * swallowed so they never break page rendering.
 */
export async function recordCampaignEvent(
  campaignId: string,
  event: AnalyticsEvent,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from("campaign_analytics").insert({
      campaign_id: campaignId,
      event_type: event,
      metadata: metadata ?? null,
    });
  } catch {
    // best-effort telemetry
  }
}
