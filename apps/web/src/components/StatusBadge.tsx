import { statusMeta } from "@/lib/categories";
import { Check, BadgeCheck, CircleSlash } from "lucide-react";
import type { ServiceStatus } from "@apihunter/db";

export function StatusBadge({ status }: { status: ServiceStatus }) {
  const meta = statusMeta(status);
  return (
    <span className={`badge ${meta.badge} whitespace-nowrap`}>
      {status === "FREE_TIER" && <Check className="h-3 w-3" />}
      {status === "VERIFIED" && <BadgeCheck className="h-3 w-3" />}
      {status === "FAILED" && <CircleSlash className="h-3 w-3" />}
      {meta.labelAr}
    </span>
  );
}