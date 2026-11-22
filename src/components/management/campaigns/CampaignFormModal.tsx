"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  campaignStatusLabels,
  campaignTypeLabels,
  conditionTypeLabels,
  requirementStatusLabels,
} from "@/context/campaignLabels";
import type {
  CampaignStatus,
  CampaignType,
  ConditionType,
  PricingType,
  RequirementStatus,
} from "@/types/campaigns";
import {
  fetchApplicantCategoryOptions,
  fetchCampaignForEdit,
  fetchManufacturerOptions,
  saveCampaign,
  type ApplicantCategoryOption,
  type CampaignConditionInput,
  type CampaignFaqInput,
  type CampaignInput,
  type CampaignVehicleInput,
  type ManufacturerOption,
} from "@/lib/supabase/campaignAdmin";

interface Props {
  isOpen: boolean;
  campaignId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const CAMPAIGN_TYPES: CampaignType[] = [
  "IMMEDIATE_SALE",
  "EXTRAORDINARY_SALE",
  "PRE_SALE",
  "OTHER",
];
const CAMPAIGN_STATUSES: CampaignStatus[] = [
  "DRAFT",
  "UPCOMING",
  "ACTIVE",
  "EXPIRED",
  "CANCELLED",
  "ARCHIVED",
];
const CONDITION_TYPES: ConditionType[] = [
  "MIN_AGE",
  "DRIVING_LICENSE",
  "ACTIVE_PLATE_RESTRICTION",
  "PREVIOUS_PURCHASE_RESTRICTION",
  "BANK_ACCOUNT",
  "PROXY_ACCOUNT",
  "BLOCKED_FUNDS",
  "MOTHERS_PLAN",
  "SCRAPPAGE",
  "OTHER",
];
const REQUIREMENT_STATUSES: RequirementStatus[] = [
  "REQUIRED",
  "NOT_REQUIRED",
  "UNSPECIFIED",
];

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const textareaClass =
  "w-full rounded-lg border border-input bg-card px-2.5 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-600 text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

const emptyVehicle: CampaignVehicleInput = {
  display_name: "",
  vehicle_model_id: null,
  official_price: null,
  initial_payment: null,
  pricing_type: "TBD",
  delivery_months: null,
  delivery_description: null,
  available_colors: [],
  notes: null,
};

const emptyCondition: CampaignConditionInput = {
  condition_type: "OTHER",
  requirement_status: "UNSPECIFIED",
  description: null,
};

const emptyForm = {
  manufacturer_id: "",
  title: "",
  slug: "",
  announcement_number: "",
  description: "",
  campaign_type: "IMMEDIATE_SALE" as CampaignType,
  status: "DRAFT" as CampaignStatus,
  published_at: "",
  registration_starts_at: "",
  registration_ends_at: "",
  official_registration_url: "",
  official_document_url: "",
  source_url: "",
  last_verified_at: "",
  applicant_category_ids: [] as string[],
  vehicles: [] as CampaignVehicleInput[],
  conditions: [] as CampaignConditionInput[],
  faqs: [] as CampaignFaqInput[],
};

type FormState = typeof emptyForm;

export default function CampaignFormModal({
  isOpen,
  campaignId,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [manufacturers, setManufacturers] = useState<ManufacturerOption[]>([]);
  const [categories, setCategories] = useState<ApplicantCategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [makers, cats] = await Promise.all([
          fetchManufacturerOptions(),
          fetchApplicantCategoryOptions(),
        ]);
        if (cancelled) return;
        setManufacturers(makers);
        setCategories(cats);

        if (campaignId) {
          const c = await fetchCampaignForEdit(campaignId);
          if (cancelled) return;
          setForm({
            manufacturer_id: c.manufacturer_id ?? "",
            title: c.title,
            slug: c.slug,
            announcement_number: c.announcement_number ?? "",
            description: c.description ?? "",
            campaign_type: c.campaign_type,
            status: c.status,
            published_at: toLocalInput(c.published_at),
            registration_starts_at: toLocalInput(c.registration_starts_at),
            registration_ends_at: toLocalInput(c.registration_ends_at),
            official_registration_url: c.official_registration_url ?? "",
            official_document_url: c.official_document_url ?? "",
            source_url: c.source_url ?? "",
            last_verified_at: toLocalInput(c.last_verified_at),
            applicant_category_ids: c.applicant_category_ids,
            vehicles: c.vehicles,
            conditions: c.conditions,
            faqs: c.faqs,
          });
        } else {
          setForm(emptyForm);
        }
      } catch {
        if (!cancelled) toast.error("خطا در بارگذاری اطلاعات طرح");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, campaignId]);

  if (!isOpen) return null;

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  const toggleCategory = (id: string) => {
    setForm((f) => ({
      ...f,
      applicant_category_ids: f.applicant_category_ids.includes(id)
        ? f.applicant_category_ids.filter((x) => x !== id)
        : [...f.applicant_category_ids, id],
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error("عنوان و شناسه (slug) الزامی است");
      return;
    }
    setSaving(true);
    try {
      const input: CampaignInput = {
        manufacturer_id: form.manufacturer_id || null,
        title: form.title,
        slug: form.slug,
        announcement_number: form.announcement_number || null,
        description: form.description || null,
        campaign_type: form.campaign_type,
        status: form.status,
        published_at: fromLocalInput(form.published_at),
        registration_starts_at: fromLocalInput(form.registration_starts_at),
        registration_ends_at: fromLocalInput(form.registration_ends_at),
        official_registration_url: form.official_registration_url || null,
        official_document_url: form.official_document_url || null,
        source_url: form.source_url || null,
        last_verified_at: fromLocalInput(form.last_verified_at),
        applicant_category_ids: form.applicant_category_ids,
        vehicles: form.vehicles.filter((v) => v.display_name.trim()),
        conditions: form.conditions.filter(
          (c) => c.description?.trim() || c.condition_type !== "OTHER",
        ),
        faqs: form.faqs.filter((f) => f.question.trim() && f.answer.trim()),
      };
      await saveCampaign(campaignId, input);
      toast.success(campaignId ? "طرح ذخیره شد" : "طرح ایجاد شد");
      onSaved();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطا در ذخیره‌سازی";
      toast.error(
        msg.includes("duplicate")
          ? "این شناسه (slug) قبلاً استفاده شده است"
          : msg,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-2xl bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-800 text-foreground">
            {campaignId ? "ویرایش طرح" : "افزودن طرح جدید"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="بستن"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 size={18} className="animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              در حال بارگذاری…
            </span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Basic */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="عنوان طرح *">
                <Input
                  value={form.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  className="h-9"
                />
              </Field>
              <Field label="شناسه آدرس (slug) *">
                <Input
                  value={form.slug}
                  onChange={(e) => patch({ slug: e.target.value })}
                  className="h-9"
                  dir="ltr"
                  placeholder="kia-cerato-1405"
                />
              </Field>
              <Field label="خودروساز">
                <select
                  className={inputClass}
                  value={form.manufacturer_id}
                  onChange={(e) => patch({ manufacturer_id: e.target.value })}
                >
                  <option value="">بدون خودروساز</option>
                  {manufacturers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="شماره بخشنامه">
                <Input
                  value={form.announcement_number}
                  onChange={(e) =>
                    patch({ announcement_number: e.target.value })
                  }
                  className="h-9"
                />
              </Field>
              <Field label="نوع طرح">
                <select
                  className={inputClass}
                  value={form.campaign_type}
                  onChange={(e) =>
                    patch({ campaign_type: e.target.value as CampaignType })
                  }
                >
                  {CAMPAIGN_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {campaignTypeLabels[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="وضعیت">
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) =>
                    patch({ status: e.target.value as CampaignStatus })
                  }
                >
                  {CAMPAIGN_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {campaignStatusLabels[s]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="توضیحات">
              <textarea
                className={textareaClass}
                rows={3}
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>

            {/* Dates */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="تاریخ انتشار">
                <Input
                  type="datetime-local"
                  className="h-9"
                  value={form.published_at}
                  onChange={(e) => patch({ published_at: e.target.value })}
                />
              </Field>
              <Field label="آخرین اعتبارسنجی">
                <Input
                  type="datetime-local"
                  className="h-9"
                  value={form.last_verified_at}
                  onChange={(e) => patch({ last_verified_at: e.target.value })}
                />
              </Field>
              <Field label="شروع ثبت‌نام">
                <Input
                  type="datetime-local"
                  className="h-9"
                  value={form.registration_starts_at}
                  onChange={(e) =>
                    patch({ registration_starts_at: e.target.value })
                  }
                />
              </Field>
              <Field label="پایان ثبت‌نام">
                <Input
                  type="datetime-local"
                  className="h-9"
                  value={form.registration_ends_at}
                  onChange={(e) =>
                    patch({ registration_ends_at: e.target.value })
                  }
                />
              </Field>
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="درگاه رسمی ثبت‌نام">
                <Input
                  className="h-9"
                  dir="ltr"
                  value={form.official_registration_url}
                  onChange={(e) =>
                    patch({ official_registration_url: e.target.value })
                  }
                />
              </Field>
              <Field label="سند رسمی (PDF)">
                <Input
                  className="h-9"
                  dir="ltr"
                  value={form.official_document_url}
                  onChange={(e) =>
                    patch({ official_document_url: e.target.value })
                  }
                />
              </Field>
              <Field label="منبع رسمی" className="sm:col-span-2">
                <Input
                  className="h-9"
                  dir="ltr"
                  value={form.source_url}
                  onChange={(e) => patch({ source_url: e.target.value })}
                />
              </Field>
            </div>

            {/* Applicant categories */}
            <div>
              <span className="mb-2 block text-xs font-600 text-muted-foreground">
                گروه‌های متقاضی
              </span>
              <div className="flex flex-wrap gap-2">
                {categories.length === 0 && (
                  <span className="text-2xs text-muted-foreground">
                    گروهی ثبت نشده است.
                  </span>
                )}
                {categories.map((c) => {
                  const active = form.applicant_category_ids.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategory(c.id)}
                      className={`filter-chip ${active ? "filter-chip-active" : ""}`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vehicles */}
            <Section
              title="خودروهای طرح"
              onAdd={() =>
                patch({ vehicles: [...form.vehicles, { ...emptyVehicle }] })
              }
            >
              {form.vehicles.map((v, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-600 text-muted-foreground">
                      خودرو {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        patch({
                          vehicles: form.vehicles.filter((_, x) => x !== i),
                        })
                      }
                      className="text-danger"
                      aria-label="حذف خودرو"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      className="h-8"
                      placeholder="نام/مدل (مثلاً Kia Cerato)"
                      value={v.display_name}
                      onChange={(e) => {
                        const next = [...form.vehicles];
                        next[i] = { ...next[i], display_name: e.target.value };
                        patch({ vehicles: next });
                      }}
                    />
                    <select
                      className={inputClass}
                      value={v.pricing_type}
                      onChange={(e) => {
                        const next = [...form.vehicles];
                        next[i] = {
                          ...next[i],
                          pricing_type: e.target.value as PricingType,
                        };
                        patch({ vehicles: next });
                      }}
                    >
                      <option value="FIXED">قیمت ثابت</option>
                      <option value="TBD">قیمت متعاقباً</option>
                    </select>
                    <Input
                      className="h-8"
                      type="number"
                      placeholder="قیمت رسمی (تومان)"
                      value={v.official_price ?? ""}
                      onChange={(e) => {
                        const next = [...form.vehicles];
                        next[i] = {
                          ...next[i],
                          official_price: e.target.value
                            ? Number(e.target.value)
                            : null,
                        };
                        patch({ vehicles: next });
                      }}
                    />
                    <Input
                      className="h-8"
                      type="number"
                      placeholder="پیش‌پرداخت (تومان)"
                      value={v.initial_payment ?? ""}
                      onChange={(e) => {
                        const next = [...form.vehicles];
                        next[i] = {
                          ...next[i],
                          initial_payment: e.target.value
                            ? Number(e.target.value)
                            : null,
                        };
                        patch({ vehicles: next });
                      }}
                    />
                    <Input
                      className="h-8"
                      type="number"
                      placeholder="زمان تحویل (ماه)"
                      value={v.delivery_months ?? ""}
                      onChange={(e) => {
                        const next = [...form.vehicles];
                        next[i] = {
                          ...next[i],
                          delivery_months: e.target.value
                            ? Number(e.target.value)
                            : null,
                        };
                        patch({ vehicles: next });
                      }}
                    />
                    <Input
                      className="h-8"
                      placeholder="رنگ‌ها (با کاما جدا کنید)"
                      value={v.available_colors.join(", ")}
                      onChange={(e) => {
                        const next = [...form.vehicles];
                        next[i] = {
                          ...next[i],
                          available_colors: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        };
                        patch({ vehicles: next });
                      }}
                    />
                  </div>
                  <Input
                    className="h-8"
                    placeholder="توضیحات/شرایط تحویل"
                    value={v.delivery_description ?? ""}
                    onChange={(e) => {
                      const next = [...form.vehicles];
                      next[i] = {
                        ...next[i],
                        delivery_description: e.target.value || null,
                      };
                      patch({ vehicles: next });
                    }}
                  />
                </div>
              ))}
            </Section>

            {/* Conditions */}
            <Section
              title="شرایط ثبت‌نام"
              onAdd={() =>
                patch({
                  conditions: [...form.conditions, { ...emptyCondition }],
                })
              }
            >
              {form.conditions.map((c, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <select
                    className={inputClass}
                    value={c.condition_type}
                    onChange={(e) => {
                      const next = [...form.conditions];
                      next[i] = {
                        ...next[i],
                        condition_type: e.target.value as ConditionType,
                      };
                      patch({ conditions: next });
                    }}
                  >
                    {CONDITION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {conditionTypeLabels[t]}
                      </option>
                    ))}
                  </select>
                  <select
                    className={inputClass}
                    value={c.requirement_status}
                    onChange={(e) => {
                      const next = [...form.conditions];
                      next[i] = {
                        ...next[i],
                        requirement_status: e.target.value as RequirementStatus,
                      };
                      patch({ conditions: next });
                    }}
                  >
                    {REQUIREMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {requirementStatusLabels[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        conditions: form.conditions.filter((_, x) => x !== i),
                      })
                    }
                    className="self-center text-danger"
                    aria-label="حذف شرط"
                  >
                    <Trash2 size={15} />
                  </button>
                  <Input
                    className="h-8 sm:col-span-3"
                    placeholder="توضیح شرط (اختیاری)"
                    value={c.description ?? ""}
                    onChange={(e) => {
                      const next = [...form.conditions];
                      next[i] = {
                        ...next[i],
                        description: e.target.value || null,
                      };
                      patch({ conditions: next });
                    }}
                  />
                </div>
              ))}
            </Section>

            {/* FAQs */}
            <Section
              title="پرسش‌های متداول"
              onAdd={() =>
                patch({ faqs: [...form.faqs, { question: "", answer: "" }] })
              }
            >
              {form.faqs.map((f, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-xl border border-border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-8"
                      placeholder="پرسش"
                      value={f.question}
                      onChange={(e) => {
                        const next = [...form.faqs];
                        next[i] = { ...next[i], question: e.target.value };
                        patch({ faqs: next });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        patch({ faqs: form.faqs.filter((_, x) => x !== i) })
                      }
                      className="text-danger"
                      aria-label="حذف پرسش"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <textarea
                    className={textareaClass}
                    rows={2}
                    placeholder="پاسخ"
                    value={f.answer}
                    onChange={(e) => {
                      const next = [...form.faqs];
                      next[i] = { ...next[i], answer: e.target.value };
                      patch({ faqs: next });
                    }}
                  />
                </div>
              ))}
            </Section>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            انصراف
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            ذخیره
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-600 text-muted-foreground">{title}</span>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-2xs font-600 text-primary hover:bg-muted"
        >
          <Plus size={13} />
          افزودن
        </button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
