import { supabase } from "./client";
import type {
  CampaignStatus,
  CampaignType,
  ConditionType,
  PricingType,
  RequirementStatus,
} from "@/types/campaigns";

// ── Admin campaign CRUD ──────────────────────────────────────────────

export interface CampaignVehicleInput {
  display_name: string;
  vehicle_model_id: string | null;
  official_price: number | null;
  initial_payment: number | null;
  pricing_type: PricingType;
  delivery_months: number | null;
  delivery_description: string | null;
  available_colors: string[];
  notes: string | null;
}

export interface CampaignConditionInput {
  condition_type: ConditionType;
  requirement_status: RequirementStatus;
  description: string | null;
}

export interface CampaignFaqInput {
  question: string;
  answer: string;
}

export interface CampaignInput {
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
  applicant_category_ids: string[];
  vehicles: CampaignVehicleInput[];
  conditions: CampaignConditionInput[];
  faqs: CampaignFaqInput[];
}

export interface AdminCampaignRow {
  id: string;
  title: string;
  slug: string;
  status: CampaignStatus;
  campaign_type: CampaignType;
  manufacturer_id: string | null;
  registration_starts_at: string | null;
  registration_ends_at: string | null;
  vehicle_count: number;
  updated_at: string;
  created_at: string;
  manufacturer: { id: string; name: string } | null;
}

export interface AdminCampaignDetailRow extends CampaignInput {
  id: string;
}

/** All campaigns (including drafts/archived) for the admin table. */
export async function fetchAdminCampaigns(): Promise<AdminCampaignRow[]> {
  const { data, error } = await supabase
    .from("registration_campaigns")
    .select(
      `id, title, slug, status, campaign_type, manufacturer_id,
       registration_starts_at, registration_ends_at, vehicle_count,
       updated_at, created_at, manufacturer:manufacturers(id, name)`,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as AdminCampaignRow[];
}

/** Hydrate a campaign + children into the flat editor shape. */
export async function fetchCampaignForEdit(
  id: string,
): Promise<AdminCampaignDetailRow> {
  const { data, error } = await supabase
    .from("registration_campaigns")
    .select(
      `*,
       vehicles:campaign_vehicles(*),
       conditions:campaign_conditions(*),
       faqs:campaign_faqs(*),
       applicant_categories:campaign_applicant_categories(applicant_category_id)`,
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  const row = data as unknown as Record<string, any>;

  return {
    id: row.id,
    manufacturer_id: row.manufacturer_id,
    title: row.title,
    slug: row.slug,
    announcement_number: row.announcement_number,
    description: row.description,
    campaign_type: row.campaign_type,
    status: row.status,
    published_at: row.published_at,
    registration_starts_at: row.registration_starts_at,
    registration_ends_at: row.registration_ends_at,
    official_registration_url: row.official_registration_url,
    official_document_url: row.official_document_url,
    source_url: row.source_url,
    last_verified_at: row.last_verified_at,
    applicant_category_ids: (row.applicant_categories ?? []).map(
      (c: { applicant_category_id: string }) => c.applicant_category_id,
    ),
    vehicles: (row.vehicles ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((v: any) => ({
        display_name: v.display_name ?? "",
        vehicle_model_id: v.vehicle_model_id,
        official_price: v.official_price,
        initial_payment: v.initial_payment,
        pricing_type: v.pricing_type,
        delivery_months: v.delivery_months,
        delivery_description: v.delivery_description,
        available_colors: v.available_colors ?? [],
        notes: v.notes,
      })),
    conditions: (row.conditions ?? []).map((c: any) => ({
      condition_type: c.condition_type,
      requirement_status: c.requirement_status,
      description: c.description,
    })),
    faqs: (row.faqs ?? [])
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((f: any) => ({ question: f.question, answer: f.answer })),
  };
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Create or update a campaign and replace all of its child records. */
export async function saveCampaign(
  id: string | null,
  input: CampaignInput,
): Promise<string> {
  const uid = await currentUserId();

  const payload = {
    manufacturer_id: input.manufacturer_id,
    title: input.title.trim(),
    slug: input.slug.trim(),
    announcement_number: input.announcement_number,
    description: input.description,
    campaign_type: input.campaign_type,
    status: input.status,
    published_at: input.published_at,
    registration_starts_at: input.registration_starts_at,
    registration_ends_at: input.registration_ends_at,
    official_registration_url: input.official_registration_url,
    official_document_url: input.official_document_url,
    source_url: input.source_url,
    last_verified_at: input.last_verified_at,
    updated_by: uid,
  };

  let campaignId = id;

  if (id) {
    const { error } = await supabase
      .from("registration_campaigns")
      .update(payload)
      .eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("registration_campaigns")
      .insert({ ...payload, created_by: uid })
      .select("id")
      .single();
    if (error) throw error;
    campaignId = (data as { id: string }).id;
  }

  const cid = campaignId as string;

  // Replace children (simple + predictable for an admin editor).
  const [vehDel, condDel, faqDel, catDel] = await Promise.all([
    supabase.from("campaign_vehicles").delete().eq("campaign_id", cid),
    supabase.from("campaign_conditions").delete().eq("campaign_id", cid),
    supabase.from("campaign_faqs").delete().eq("campaign_id", cid),
    supabase
      .from("campaign_applicant_categories")
      .delete()
      .eq("campaign_id", cid),
  ]);
  for (const r of [vehDel, condDel, faqDel, catDel]) {
    if (r.error) throw r.error;
  }

  if (input.vehicles.length) {
    const { error } = await supabase.from("campaign_vehicles").insert(
      input.vehicles.map((v, i) => ({
        campaign_id: cid,
        display_name: v.display_name || null,
        vehicle_model_id: v.vehicle_model_id,
        official_price: v.official_price,
        initial_payment: v.initial_payment,
        pricing_type: v.pricing_type,
        delivery_months: v.delivery_months,
        delivery_description: v.delivery_description,
        available_colors: v.available_colors.length ? v.available_colors : null,
        notes: v.notes,
        sort_order: i,
      })),
    );
    if (error) throw error;
  }

  if (input.conditions.length) {
    const { error } = await supabase.from("campaign_conditions").insert(
      input.conditions.map((c) => ({
        campaign_id: cid,
        condition_type: c.condition_type,
        requirement_status: c.requirement_status,
        description: c.description,
      })),
    );
    if (error) throw error;
  }

  if (input.faqs.length) {
    const { error } = await supabase.from("campaign_faqs").insert(
      input.faqs.map((f, i) => ({
        campaign_id: cid,
        question: f.question,
        answer: f.answer,
        display_order: i,
        is_published: true,
      })),
    );
    if (error) throw error;
  }

  if (input.applicant_category_ids.length) {
    const { error } = await supabase
      .from("campaign_applicant_categories")
      .insert(
        input.applicant_category_ids.map((categoryId) => ({
          campaign_id: cid,
          applicant_category_id: categoryId,
        })),
      );
    if (error) throw error;
  }

  return cid;
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase
    .from("registration_campaigns")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Options for the editor ───────────────────────────────────────────

export interface ManufacturerOption {
  id: string;
  name: string;
  is_active: boolean;
}

export async function fetchManufacturerOptions(): Promise<
  ManufacturerOption[]
> {
  const { data, error } = await supabase
    .from("manufacturers")
    .select("id, name, is_active")
    .order("name");
  if (error) throw error;
  return (data ?? []) as ManufacturerOption[];
}

export interface ApplicantCategoryOption {
  id: string;
  name: string;
}

export async function fetchApplicantCategoryOptions(): Promise<
  ApplicantCategoryOption[]
> {
  const { data, error } = await supabase
    .from("applicant_categories")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return (data ?? []) as ApplicantCategoryOption[];
}

// ── Per-campaign participants (users) ────────────────────────────────

export interface CampaignParticipant {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  avatar_path: string | null;
  role: string | null;
  sources: string[];
  last_activity: string | null;
}

/** Fetches users tied to a campaign (favorites, comments, poll votes). */
export async function fetchCampaignParticipants(
  campaignId: string,
): Promise<CampaignParticipant[]> {
  const res = await fetch(`/api/admin/campaigns/${campaignId}/participants`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("failed to load participants");
  const json = (await res.json()) as { participants: CampaignParticipant[] };
  return json.participants ?? [];
}
