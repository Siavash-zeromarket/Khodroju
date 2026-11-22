"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  campaignSortLabels,
  campaignStatusLabels,
  campaignTypeLabels,
  toFa,
} from "@/context/campaignLabels";
import type {
  ApplicantCategory,
  CampaignFilter,
  CampaignSort,
  CampaignStatus,
  CampaignType,
  Manufacturer,
  VehicleModel,
} from "@/types/campaigns";

const STATUS_CHIPS: CampaignStatus[] = ["ACTIVE", "UPCOMING", "EXPIRED"];
const TYPE_CHIPS: CampaignType[] = [
  "IMMEDIATE_SALE",
  "EXTRAORDINARY_SALE",
  "PRE_SALE",
];
const SORTS: CampaignSort[] = [
  "newest",
  "deadline",
  "lowest_payment",
  "shortest_delivery",
];
const DELIVERY_OPTIONS = [1, 3, 6, 12];

interface Props {
  filter: CampaignFilter;
  onChange: (patch: Partial<CampaignFilter>) => void;
  onReset: () => void;
  manufacturers: Manufacturer[];
  categories: ApplicantCategory[];
  models: VehicleModel[];
}

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function CampaignFilters({
  filter,
  onChange,
  onReset,
  manufacturers,
  categories,
  models,
}: Props) {
  const activeStatus = filter.status?.[0];
  const activeType = filter.type?.[0];
  const hasFilters =
    !!filter.search ||
    !!filter.status?.length ||
    !!filter.type?.length ||
    !!filter.manufacturerId ||
    !!filter.applicantCategoryId ||
    !!filter.vehicleModelId ||
    filter.paymentMin !== undefined ||
    filter.paymentMax !== undefined ||
    filter.maxDeliveryMonths !== undefined;

  return (
    <div className="card-elevated space-y-4 p-4">
      {/* Search + sort */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={filter.search ?? ""}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
            placeholder="جست‌وجوی خودروساز، خودرو یا عنوان طرح…"
            className="h-9 pr-9"
            aria-label="جست‌وجو"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            size={16}
            className="hidden text-muted-foreground sm:block"
          />
          <select
            className={`${selectClass} sm:w-52`}
            value={filter.sort ?? "newest"}
            onChange={(e) =>
              onChange({ sort: e.target.value as CampaignSort, page: 1 })
            }
            aria-label="مرتب‌سازی"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {campaignSortLabels[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange({ status: undefined, page: 1 })}
          className={`filter-chip ${!activeStatus ? "filter-chip-active" : ""}`}
        >
          همه وضعیت‌ها
        </button>
        {STATUS_CHIPS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ status: [s], page: 1 })}
            className={`filter-chip ${activeStatus === s ? "filter-chip-active" : ""}`}
          >
            {campaignStatusLabels[s]}
          </button>
        ))}
      </div>

      {/* Type chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange({ type: undefined, page: 1 })}
          className={`filter-chip ${!activeType ? "filter-chip-active" : ""}`}
        >
          همه انواع
        </button>
        {TYPE_CHIPS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange({ type: [t], page: 1 })}
            className={`filter-chip ${activeType === t ? "filter-chip-active" : ""}`}
          >
            {campaignTypeLabels[t]}
          </button>
        ))}
      </div>

      {/* Selects */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select
          className={selectClass}
          value={filter.manufacturerId ?? ""}
          onChange={(e) =>
            onChange({ manufacturerId: e.target.value || undefined, page: 1 })
          }
          aria-label="خودروساز"
        >
          <option value="">همه خودروسازان</option>
          {manufacturers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filter.applicantCategoryId ?? ""}
          onChange={(e) =>
            onChange({
              applicantCategoryId: e.target.value || undefined,
              page: 1,
            })
          }
          aria-label="گروه متقاضیان"
        >
          <option value="">همه گروه‌های متقاضی</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filter.vehicleModelId ?? ""}
          onChange={(e) =>
            onChange({ vehicleModelId: e.target.value || undefined, page: 1 })
          }
          aria-label="مدل خودرو"
        >
          <option value="">همه مدل‌ها</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filter.maxDeliveryMonths?.toString() ?? ""}
          onChange={(e) =>
            onChange({
              maxDeliveryMonths: e.target.value
                ? Number(e.target.value)
                : undefined,
              page: 1,
            })
          }
          aria-label="حداکثر زمان تحویل"
        >
          <option value="">هر زمان تحویلی</option>
          {DELIVERY_OPTIONS.map((m) => (
            <option key={m} value={m}>
              تا {toFa(m)} ماه
            </option>
          ))}
        </select>
      </div>

      {/* Payment range + reset */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={filter.paymentMin ?? ""}
            onChange={(e) =>
              onChange({
                paymentMin: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              })
            }
            placeholder="حداقل پیش‌پرداخت (تومان)"
            className="h-9"
            aria-label="حداقل پیش‌پرداخت"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={filter.paymentMax ?? ""}
            onChange={(e) =>
              onChange({
                paymentMax: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              })
            }
            placeholder="حداکثر پیش‌پرداخت (تومان)"
            className="h-9"
            aria-label="حداکثر پیش‌پرداخت"
          />
        </div>
        {hasFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            className="h-9 shrink-0"
          >
            <X size={14} />
            پاک‌کردن فیلترها
          </Button>
        )}
      </div>
    </div>
  );
}
