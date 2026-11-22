import type { Metadata } from "next";
import CarRegistrationDirectory from "@/components/car-registration/CarRegistrationDirectory";

export const metadata: Metadata = {
  title: "طرح‌های ثبت‌نام و فروش خودرو | خودروجو",
  description:
    "فهرست کامل بخشنامه‌ها و طرح‌های ثبت‌نام و فروش خودروهای صفر در ایران؛ شرایط، خودروهای موجود و درگاه‌های رسمی ثبت‌نام.",
  alternates: { canonical: "/car-registration" },
  openGraph: {
    title: "طرح‌های ثبت‌نام و فروش خودرو | خودروجو",
    description:
      "فهرست کامل بخشنامه‌ها و طرح‌های ثبت‌نام و فروش خودروهای صفر در ایران.",
    type: "website",
  },
};

export default function CarRegistrationPage() {
  return (
    <main className="pt-16" dir="rtl">
      <CarRegistrationDirectory />
    </main>
  );
}
