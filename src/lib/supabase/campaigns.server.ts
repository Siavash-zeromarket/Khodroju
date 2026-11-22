import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { ApplicantCategory, CampaignDetail } from "@/types/campaigns";

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

function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: async () => (await cookies()).getAll(),
      setAll: () => {},
    },
  });
}

type DetailRow = Omit<CampaignDetail, "applicant_categories" | "vehicles"> & {
  applicant_categories?: Array<{
    applicant_category: ApplicantCategory | null;
  }> | null;
  vehicles?: CampaignDetail["vehicles"] | null;
};

/** Server-side fetch used by the SEO detail page + generateMetadata. */
export async function fetchCampaignDetailBySlug(
  slug: string,
): Promise<CampaignDetail | null> {
  const supabase = createServerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("registration_campaigns")
    .select(DETAIL_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) return null;
  if (!data) return null;

  const row = data as unknown as DetailRow;
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
