"use client";

import Link from "next/link";
import { Car, ChevronLeft, Megaphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchCampaigns,
  fetchManufacturers,
  fetchVehicleModels,
} from "@/lib/supabase/campaigns";
import {
  campaignStatusClass,
  campaignStatusLabels,
  campaignTypeLabels,
  formatCampaignDate,
} from "@/context/campaignLabels";
import type {
  CampaignListItem,
  Manufacturer,
  VehicleModel,
} from "@/types/campaigns";

interface VehicleRequestWidgetProps {
  className?: string;
  preselectedBrand?: string;
  preselectedModel?: string;
  /** Optional prefix to keep control ids unique when rendered more than once. */
  idPrefix?: string;
}

const VISIBLE_LIMIT = 4;

function CampaignRow({ campaign }: { campaign: CampaignListItem }) {
  return (
    <Link
      href={`/car-registration/${campaign.slug}`}
      className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 transition-colors hover:bg-muted"
    >
      <div className="min-w-0">
        <div className="truncate text-xs font-700 text-foreground">
          {campaign.title}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-2xs text-muted-foreground">
          <span
            className={`${campaignStatusClass[campaign.status]} rounded px-1.5 py-0.5 font-600`}
          >
            {campaignStatusLabels[campaign.status]}
          </span>
          <span className="truncate">
            {campaignTypeLabels[campaign.campaign_type]} · مهلت:{" "}
            {formatCampaignDate(campaign.registration_ends_at)}
          </span>
        </div>
      </div>
      <ChevronLeft size={15} className="shrink-0 text-primary" />
    </Link>
  );
}

export function VehicleRequestWidget({
  className,
  preselectedBrand,
  preselectedModel,
  idPrefix = "",
}: VehicleRequestWidgetProps) {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [manufacturersLoading, setManufacturersLoading] = useState(true);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [brandValue, setBrandValue] = useState(preselectedBrand ?? "");
  const [modelValue, setModelValue] = useState(preselectedModel ?? "");
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  const brandOptions = useMemo(
    () => manufacturers.map((m) => m.name),
    [manufacturers],
  );
  const modelOptions = useMemo(() => models.map((m) => m.name), [models]);

  const brandId = useMemo(
    () => manufacturers.find((m) => m.name === brandValue)?.id,
    [manufacturers, brandValue],
  );
  const modelId = useMemo(
    () => models.find((m) => m.name === modelValue)?.id,
    [models, modelValue],
  );

  // Load manufacturers that publish campaigns.
  useEffect(() => {
    let cancelled = false;
    setManufacturersLoading(true);
    fetchManufacturers()
      .then((rows) => {
        if (!cancelled) setManufacturers(rows);
      })
      .catch(() => {
        if (!cancelled) setManufacturers([]);
      })
      .finally(() => {
        if (!cancelled) setManufacturersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load models for the selected manufacturer.
  useEffect(() => {
    let cancelled = false;
    if (!brandId) {
      setModels([]);
      return;
    }
    setModelsLoading(true);
    fetchVehicleModels(brandId)
      .then((rows) => {
        if (!cancelled) setModels(rows);
      })
      .catch(() => {
        if (!cancelled) setModels([]);
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [brandId]);

  // Load matching active/upcoming campaigns. With no selection, show the
  // soonest-deadline campaigns as a browsable starting point.
  useEffect(() => {
    let cancelled = false;
    setCampaignsLoading(true);
    fetchCampaigns({
      status: ["ACTIVE", "UPCOMING"],
      manufacturerId: brandId,
      vehicleModelId: modelId,
      sort: "deadline",
      pageSize: VISIBLE_LIMIT,
    })
      .then((res) => {
        if (!cancelled) setCampaigns(res.items);
      })
      .catch(() => {
        if (!cancelled) setCampaigns([]);
      })
      .finally(() => {
        if (!cancelled) setCampaignsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [brandId, modelId]);

  const handleBrandChange = (value: string) => {
    setBrandValue(value);
    setModelValue("");
  };

  const hasFilter = Boolean(brandValue || modelValue);

  return (
    <div className={`vazir-matn ${className ?? ""}`} dir="rtl">
      <div className="card-elevated p-4 md:p-6">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <Car size={20} />
          <h3 className="text-lg font-800 text-foreground">
            طرح‌های ثبت‌نام خودرو
          </h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          خودروساز و مدل مورد نظر خود را انتخاب کنید تا طرح‌های فعال و پیش‌روی
          آن نمایش داده شود.
        </p>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SearchSelect
            id={`${idPrefix}widget-brand`}
            label="خودروساز"
            value={brandValue}
            options={brandOptions}
            placeholder="انتخاب خودروساز"
            onChange={handleBrandChange}
            loading={manufacturersLoading}
            emptyText="خودروسازی یافت نشد"
            disabled={manufacturersLoading}
          />

          <SearchSelect
            id={`${idPrefix}widget-model`}
            label="مدل"
            value={modelValue}
            options={modelOptions}
            placeholder={
              modelsLoading
                ? "در حال بارگذاری…"
                : !brandValue
                  ? "ابتدا خودروساز را انتخاب کنید"
                  : modelOptions.length === 0
                    ? "مدلی یافت نشد"
                    : "انتخاب مدل"
            }
            emptyText="مدلی یافت نشد"
            loading={modelsLoading}
            disabled={!brandValue || modelsLoading}
            onChange={setModelValue}
          />
        </div>

        {/* Matching campaigns */}
        <div className="space-y-2">
          {campaignsLoading ? (
            <>
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-6 text-center">
              <Megaphone size={20} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {hasFilter
                  ? "طرحی برای این انتخاب یافت نشد."
                  : "در حال حاضر طرح فعالی ثبت نشده است."}
              </p>
            </div>
          ) : (
            campaigns.map((c) => <CampaignRow key={c.id} campaign={c} />)
          )}
        </div>

        <Link
          href="/car-registration"
          className="btn-primary mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm"
        >
          مشاهده همه طرح‌ها
          <ChevronLeft size={16} />
        </Link>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          مرجع رسمی بخشنامه‌ها و طرح‌های فروش خودرو
        </p>
      </div>
    </div>
  );
}
