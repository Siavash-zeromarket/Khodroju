"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import {
  deleteCampaign,
  fetchAdminCampaigns,
  fetchCampaignParticipants,
  type AdminCampaignRow,
  type CampaignParticipant,
} from "@/lib/supabase/campaignAdmin";
import {
  campaignStatusClass,
  campaignStatusLabels,
  campaignTypeLabels,
  formatCampaignDate,
  toFa,
} from "@/context/campaignLabels";
import CampaignFormModal from "./CampaignFormModal";

const sourceLabels: Record<string, string> = {
  favorite: "علاقه‌مندی",
  comment: "دیدگاه",
  vote: "رأی نظرسنجی",
};

export default function CampaignsManager() {
  const [campaigns, setCampaigns] = useState<AdminCampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminCampaignRow | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const [participantsFor, setParticipantsFor] =
    useState<AdminCampaignRow | null>(null);
  const [participants, setParticipants] = useState<CampaignParticipant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCampaigns(await fetchAdminCampaigns());
    } catch {
      toast.error("خطا در بارگذاری طرح‌ها");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setFormOpen(true);
  };
  const openEdit = (id: string) => {
    setEditingId(id);
    setFormOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCampaign(deleteTarget.id);
      toast.success("طرح حذف شد");
      setDeleteTarget(null);
      void load();
    } catch {
      toast.error("خطا در حذف طرح");
    } finally {
      setDeleting(false);
    }
  };

  const openParticipants = async (campaign: AdminCampaignRow) => {
    setParticipantsFor(campaign);
    setParticipants([]);
    setParticipantsLoading(true);
    try {
      setParticipants(await fetchCampaignParticipants(campaign.id));
    } catch {
      toast.error("خطا در بارگذاری کاربران این طرح");
      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-700 text-foreground">
            طرح‌های ثبت‌نام خودرو ({toFa(campaigns.length)})
          </h2>
          <p className="text-xs text-muted-foreground">
            ایجاد، ویرایش، حذف و مشاهده طرح‌ها و کاربران هر طرح
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={14} />
            بروزرسانی
          </Button>
          <Button onClick={openCreate}>
            <Plus size={15} />
            افزودن طرح
          </Button>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 size={18} className="animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              در حال بارگذاری…
            </span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            هنوز طرحی ثبت نشده است. با دکمه «افزودن طرح» اولین طرح را بسازید.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-700 text-foreground">
                      {c.title}
                    </span>
                    <span
                      className={`${campaignStatusClass[c.status]} rounded px-1.5 py-0.5 text-2xs font-600`}
                    >
                      {campaignStatusLabels[c.status]}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">
                      {campaignTypeLabels[c.campaign_type]}
                    </span>
                  </div>
                  <div className="mt-1 text-2xs text-muted-foreground">
                    {c.manufacturer?.name ?? "بدون خودروساز"} ·{" "}
                    {toFa(c.vehicle_count)} خودرو · مهلت:{" "}
                    {formatCampaignDate(c.registration_ends_at)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/car-registration/${c.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-2xs font-600 text-foreground hover:bg-muted"
                  >
                    <ExternalLink size={13} />
                    مشاهده
                  </Link>
                  <button
                    type="button"
                    onClick={() => void openParticipants(c)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-2xs font-600 text-primary hover:bg-muted"
                  >
                    <Users size={13} />
                    کاربران
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(c.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-2xs font-600 text-foreground hover:bg-muted"
                  >
                    <Pencil size={13} />
                    ویرایش
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(c)}
                    className="inline-flex items-center gap-1 rounded-lg border border-danger/30 px-2.5 py-1.5 text-2xs font-600 text-danger hover:bg-danger/10"
                  >
                    <Trash2 size={13} />
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CampaignFormModal
        isOpen={formOpen}
        campaignId={editingId}
        onClose={() => setFormOpen(false)}
        onSaved={() => void load()}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="حذف طرح"
        message={`آیا از حذف «${deleteTarget?.title ?? ""}» مطمئن هستید؟ این عمل قابل بازگشت نیست.`}
      />

      {participantsFor && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          onClick={() => setParticipantsFor(null)}
        >
          <div
            className="my-8 w-full max-w-3xl rounded-2xl bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-700 text-foreground">
                  کاربران طرح
                </h3>
                <p className="text-2xs text-muted-foreground">
                  {participantsFor.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setParticipantsFor(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="بستن"
              >
                <X size={18} />
              </button>
            </div>

            {participantsLoading ? (
              <div className="flex items-center justify-center gap-2 py-12">
                <Loader2 size={18} className="animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  در حال بارگذاری…
                </span>
              </div>
            ) : participants.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                هنوز کاربری با این طرح تعامل نداشته است.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-right text-2xs text-muted-foreground">
                      <th className="px-2 py-2 font-600">نام</th>
                      <th className="px-2 py-2 font-600">ایمیل</th>
                      <th className="px-2 py-2 font-600">تلفن</th>
                      <th className="px-2 py-2 font-600">شهر</th>
                      <th className="px-2 py-2 font-600">نوع تعامل</th>
                      <th className="px-2 py-2 font-600">آخرین فعالیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => (
                      <tr
                        key={p.user_id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-2 py-2 font-600 text-foreground">
                          {p.full_name ?? "—"}
                        </td>
                        <td
                          className="px-2 py-2 text-muted-foreground"
                          dir="ltr"
                        >
                          {p.email ?? "—"}
                        </td>
                        <td
                          className="px-2 py-2 text-muted-foreground"
                          dir="ltr"
                        >
                          {p.phone ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">
                          {p.city ?? "—"}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap gap-1">
                            {p.sources.map((s) => (
                              <span
                                key={s}
                                className="rounded bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground"
                              >
                                {sourceLabels[s] ?? s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-2xs text-muted-foreground">
                          {p.last_activity
                            ? formatCampaignDate(p.last_activity)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
