"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Megaphone, RotateCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  fetchApplicantCategories,
  fetchCampaigns,
  fetchCampaignStats,
  fetchManufacturers,
  fetchVehicleModels,
} from "@/lib/supabase/campaigns";
import { toFa } from "@/context/campaignLabels";
import type {
  ApplicantCategory,
  CampaignFilter,
  CampaignListItem,
  CampaignStats,
  Manufacturer,
  VehicleModel,
} from "@/types/campaigns";
import CampaignCard from "./CampaignCard";
import CampaignFilters from "./CampaignFilters";
import CampaignStatsBar from "./CampaignStatsBar";

const PAGE_SIZE = 12;
const DEFAULT_FILTER: CampaignFilter = {
  sort: "newest",
  page: 1,
  pageSize: PAGE_SIZE,
};
const EMPTY_STATS: CampaignStats = {
  total: 0,
  active: 0,
  upcoming: 0,
  expired: 0,
  cancelled: 0,
};

function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-elevated space-y-3 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function SectionHeading({
  title,
  count,
  accent,
}: {
  title: string;
  count?: number;
  accent?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={`size-2 rounded-full ${accent ?? "bg-primary"}`} />
      <h2 className="text-base font-700 text-foreground">{title}</h2>
      {count !== undefined && (
        <span className="rounded-md bg-muted px-2 py-0.5 text-2xs text-muted-foreground">
          {toFa(count)}
        </span>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card-elevated flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Megaphone size={26} />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function CarRegistrationDirectory() {
  const [filter, setFilter] = useState<CampaignFilter>(DEFAULT_FILTER);
  const [items, setItems] = useState<CampaignListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<CampaignStats>(EMPTY_STATS);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [categories, setCategories] = useState<ApplicantCategory[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [sections, setSections] = useState<{
    active: CampaignListItem[];
    upcoming: CampaignListItem[];
    expired: CampaignListItem[];
  }>({ active: [], upcoming: [], expired: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // Stats + filter options (loaded once).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, m, c, v] = await Promise.all([
          fetchCampaignStats(),
          fetchManufacturers(),
          fetchApplicantCategories(),
          fetchVehicleModels(),
        ]);
        if (cancelled) return;
        setStats(s);
        setManufacturers(m);
        setCategories(c);
        setModels(v);
      } catch {
        if (!cancelled) setStats(EMPTY_STATS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasFilters =
    !!filter.search?.trim() ||
    !!filter.status?.length ||
    !!filter.type?.length ||
    !!filter.manufacturerId ||
    !!filter.applicantCategoryId ||
    !!filter.vehicleModelId ||
    filter.paymentMin !== undefined ||
    filter.paymentMax !== undefined ||
    filter.maxDeliveryMonths !== undefined;

  const isDefaultView =
    !hasFilters &&
    (filter.sort ?? "newest") === "newest" &&
    (filter.page ?? 1) === 1;

  const onChange = useCallback((patch: Partial<CampaignFilter>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
  }, []);

  const onReset = useCallback(() => setFilter(DEFAULT_FILTER), []);

  // Filters/search can be noisy — debounce the ones that come from typing.
  const searchTerm = filter.search?.trim() ?? "";
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    const effective: CampaignFilter = {
      ...filter,
      search: debouncedSearch || undefined,
    };

    (async () => {
      try {
        if (isDefaultView) {
          const [active, upcoming, expired] = await Promise.all([
            fetchCampaigns({
              status: ["ACTIVE"],
              sort: "deadline",
              pageSize: 6,
            }),
            fetchCampaigns({
              status: ["UPCOMING"],
              sort: "deadline",
              pageSize: 6,
            }),
            fetchCampaigns({
              status: ["EXPIRED"],
              sort: "newest",
              pageSize: 6,
            }),
          ]);
          if (id !== requestId.current) return;
          setSections({
            active: active.items,
            upcoming: upcoming.items,
            expired: expired.items,
          });
        } else {
          const res = await fetchCampaigns(effective);
          if (id !== requestId.current) return;
          setItems(res.items);
          setTotal(res.total);
        }
      } catch {
        if (id !== requestId.current) return;
        setError("خطا در بارگذاری طرح‌ها. لطفاً دوباره تلاش کنید.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    })();
  }, [filter, debouncedSearch, isDefaultView]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = filter.page ?? 1;

  const renderGrid = (list: CampaignListItem[]) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((c) => (
        <CampaignCard key={c.id} campaign={c} />
      ))}
    </div>
  );

  const isEmpty = useMemo(
    () =>
      isDefaultView
        ? !sections.active.length &&
          !sections.upcoming.length &&
          !sections.expired.length
        : !items.length,
    [isDefaultView, sections, items],
  );

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 lg:px-8 xl:px-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-800 text-foreground sm:text-3xl">
          طرح‌های ثبت‌نام و فروش خودرو
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          مرجع یکپارچه بخشنامه‌ها و طرح‌های فروش خودروهای صفر؛ شرایط ثبت‌نام،
          خودروهای موجود و پیوند به درگاه‌های رسمی خودروسازان.
        </p>
      </div>

      <div className="mb-6">
        <CampaignStatsBar stats={stats} />
      </div>

      <div className="mb-6">
        <CampaignFilters
          filter={{ ...filter, search: searchTerm }}
          onChange={onChange}
          onReset={onReset}
          manufacturers={manufacturers}
          categories={categories}
          models={models}
        />
      </div>

      {error ? (
        <div className="card-elevated flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-sm text-danger">{error}</p>
          <Button variant="outline" onClick={() => setFilter({ ...filter })}>
            <RotateCw size={14} />
            تلاش دوباره
          </Button>
        </div>
      ) : loading ? (
        <CardSkeletonGrid />
      ) : isEmpty ? (
        <EmptyState message="در حال حاضر طرحی مطابق با جست‌وجو یا فیلترهای شما یافت نشد." />
      ) : isDefaultView ? (
        <div className="space-y-10">
          {sections.active.length > 0 && (
            <section>
              <SectionHeading
                title="در حال ثبت‌نام"
                count={sections.active.length}
                accent="bg-success"
              />
              {renderGrid(sections.active)}
            </section>
          )}
          {sections.upcoming.length > 0 && (
            <section>
              <SectionHeading
                title="طرح‌های پیش‌رو"
                count={sections.upcoming.length}
                accent="bg-primary"
              />
              {renderGrid(sections.upcoming)}
            </section>
          )}
          {sections.expired.length > 0 && (
            <section>
              <SectionHeading
                title="به‌تازگی پایان‌یافته"
                count={sections.expired.length}
                accent="bg-muted-foreground"
              />
              {renderGrid(sections.expired)}
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {toFa(total)} طرح یافت شد
            </p>
          </div>
          {renderGrid(items)}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => onChange({ page: currentPage - 1 })}
              >
                <ChevronRight size={14} />
                قبلی
              </Button>
              <span className="text-sm text-muted-foreground">
                صفحه {toFa(currentPage)} از {toFa(totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => onChange({ page: currentPage + 1 })}
              >
                بعدی
                <ChevronLeft size={14} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
