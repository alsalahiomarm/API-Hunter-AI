import { statusMeta } from "@/lib/categories";
import { Check, BadgeCheck, CircleSlash } from "lucide-react";
import type { ServiceStatus } from "@apihunter/db";
import { useI18n } from "@/lib/i18n";

export function StatusBadge({ status, lang = "ar" }: { status: ServiceStatus; lang?: "ar" | "en" }) {
  const meta = statusMeta(status);
  const label = lang === "en" ? meta.labelEn : meta.labelAr;

  return (
    <span className={`badge ${meta.badge} whitespace-nowrap`}>
      {status === "FREE_TIER" && <Check className="h-3 w-3" />}
      {status === "VERIFIED" && <BadgeCheck className="h-3 w-3" />}
      {status === "FAILED" && <CircleSlash className="h-3 w-3" />}
      {label}
    </span>
  );
}
