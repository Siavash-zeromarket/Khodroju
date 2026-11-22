"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

export default function ShareCampaignButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // user cancelled or clipboard unavailable — no-op
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-600 text-foreground transition-colors hover:bg-muted"
    >
      {copied ? (
        <Check size={15} className="text-success" />
      ) : (
        <Share2 size={15} />
      )}
      {copied ? "کپی شد" : "اشتراک‌گذاری"}
    </button>
  );
}
