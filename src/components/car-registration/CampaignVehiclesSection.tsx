import { Car, Palette, Truck, Wallet } from "lucide-react";
import { formatPrice } from "@/context/data";
import {
  deliveryLabel,
  pricingTypeLabels,
  toFa,
} from "@/context/campaignLabels";
import type { CampaignVehicle } from "@/types/campaigns";
import DetailSection from "./DetailSection";

function VehicleCard({ vehicle }: { vehicle: CampaignVehicle }) {
  const name = vehicle.vehicle_model?.name ?? vehicle.display_name ?? "خودرو";
  const trim = vehicle.vehicle_model?.trim ?? null;
  const image = vehicle.vehicle_model?.image_url ?? null;

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={name}
              className="size-full object-contain"
              loading="lazy"
            />
          ) : (
            <Car size={26} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-700 text-foreground">{name}</div>
          {trim && <div className="text-2xs text-muted-foreground">{trim}</div>}
          <div className="mt-2 grid grid-cols-1 gap-1.5 text-2xs text-muted-foreground sm:grid-cols-2">
            <span className="flex items-center gap-1.5">
              <Wallet size={13} className="text-primary" />
              پیش‌پرداخت:{" "}
              <span className="font-600 text-foreground">
                {vehicle.initial_payment != null
                  ? `${formatPrice(vehicle.initial_payment)} تومان`
                  : "اعلام نشده"}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Truck size={13} className="text-accent" />
              تحویل:{" "}
              {deliveryLabel(
                vehicle.delivery_months,
                vehicle.delivery_description,
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-2xs">
        <span className="text-muted-foreground">
          قیمت رسمی:{" "}
          <span className="font-600 text-foreground">
            {vehicle.official_price != null
              ? `${formatPrice(vehicle.official_price)} تومان`
              : pricingTypeLabels[vehicle.pricing_type]}
          </span>
        </span>
        {vehicle.available_colors && vehicle.available_colors.length > 0 && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Palette size={12} />
            رنگ‌ها: {vehicle.available_colors.join("، ")}
          </span>
        )}
      </div>

      {vehicle.notes && (
        <p className="mt-2 text-2xs leading-6 text-muted-foreground">
          {vehicle.notes}
        </p>
      )}
    </div>
  );
}

export default function CampaignVehiclesSection({
  vehicles,
}: {
  vehicles: CampaignVehicle[];
}) {
  if (!vehicles.length) return null;

  return (
    <DetailSection
      icon={<Car size={18} />}
      title={`خودروهای این طرح (${toFa(vehicles.length)})`}
      description="قیمت‌ها و شرایط تحویل مطابق اعلام رسمی خودروساز است؛ اطلاعات منتشرنشده نمایش داده نمی‌شود."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {vehicles.map((v) => (
          <VehicleCard key={v.id} vehicle={v} />
        ))}
      </div>
    </DetailSection>
  );
}
