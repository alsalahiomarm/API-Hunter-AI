"use client";

import { Radar } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function EmptyState() {
  const { t } = useI18n();

  return (
    <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25">
        <Radar className="h-7 w-7" />
      </span>
      <h3 className="text-lg font-black text-white">{t("empty.title")}</h3>
      <p className="max-w-sm text-sm leading-6 text-slate-400">
        {t("empty.description")}
      </p>
    </div>
  );
}
