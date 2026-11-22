import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchCampaignDetailBySlug } from "@/lib/supabase/campaigns.server";
import CampaignDetail from "@/components/car-registration/CampaignDetail";
import { formatCampaignDate } from "@/context/campaignLabels";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await fetchCampaignDetailBySlug(slug);

  if (!campaign) {
    return { title: "طرح یافت نشد | خودروجو" };
  }

  const maker = campaign.manufacturer?.name ?? "";
  const title = `${campaign.title}${maker ? ` | ${maker}` : ""}`;
  const description = (
    campaign.description ??
    `جزئیات طرح ثبت‌نام ${maker}؛ خودروهای موجود، شرایط، پیش‌پرداخت و مهلت ثبت‌نام.`
  ).slice(0, 300);

  return {
    title,
    description,
    alternates: { canonical: `/car-registration/${campaign.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/car-registration/${campaign.slug}`,
    },
  };
}

function CampaignJsonLd({
  campaign,
}: {
  campaign: NonNullable<Awaited<ReturnType<typeof fetchCampaignDetailBySlug>>>;
}) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const url = `${base}/car-registration/${campaign.slug}`;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "خانه", item: `${base}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: "طرح‌های ثبت‌نام",
          item: `${base}/car-registration`,
        },
        { "@type": "ListItem", position: 3, name: campaign.title, item: url },
      ],
    },
  ];

  if (campaign.registration_starts_at || campaign.registration_ends_at) {
    graph.push({
      "@type": "Event",
      name: campaign.title,
      startDate: campaign.registration_starts_at ?? undefined,
      endDate: campaign.registration_ends_at ?? undefined,
      eventStatus:
        campaign.status === "CANCELLED"
          ? "https://schema.org/EventCancelled"
          : "https://schema.org/EventScheduled",
      organizer: campaign.manufacturer
        ? { "@type": "Organization", name: campaign.manufacturer.name }
        : undefined,
      url,
      description: campaign.description ?? undefined,
    });
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": graph,
        }),
      }}
    />
  );
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const campaign = await fetchCampaignDetailBySlug(slug);

  if (!campaign) notFound();

  return (
    <main className="pt-16" dir="rtl">
      <CampaignJsonLd campaign={campaign} />
      <CampaignDetail campaign={campaign} />
      <p className="sr-only">
        آخرین بروزرسانی: {formatCampaignDate(campaign.updated_at)}
      </p>
    </main>
  );
}
