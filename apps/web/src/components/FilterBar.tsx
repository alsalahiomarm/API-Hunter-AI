"use client";

import { Search, X, ListFilter } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { useI18n } from "@/lib/i18n";
import type { Category, ServiceStatus } from "@apihunter/db";

export interface FilterState {
  search: string;
  category: Category | "";
  status: ServiceStatus | "";
}

interface Props {
  filter: FilterState;
  onChange: (next: FilterState) => void;
}

export default function FilterBar({ filter, onChange }: Props) {
  const { t, lang, isRtl } = useI18n();

  const STATUS_OPTIONS: { value: ServiceStatus | ""; label: string }[] = [
    { value: "", label: t("filter.allStatus") },
    { value: "FREE_TIER", label: t("status.FREE_TIER") },
    { value: "FREE_CREDIT", label: t("status.FREE_CREDIT") },
    { value: "TRIAL", label: t("status.TRIAL") },
    { value: "VERIFIED", label: t("status.VERIFIED") },
  ];

  return (
    <div className="space-y-4">
      {/* شريط البحث */}
      <div className="relative">
        <Search
          className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 ${
            isRtl ? "right-3.5" : "left-3.5"
          }`}
        />
        <input
          type="search"
          value={filter.search}
          onChange={(e) => onChange({ ...filter, search: e.target.value })}
          placeholder={t("filter.search")}
          className={`input-dark py-3 text-base ${isRtl ? "pr-11" : "pl-11"}`}
          aria-label={t("filter.search")}
        />
        {filter.search && (
          <button
            type="button"
            onClick={() => onChange({ ...filter, search: "" })}
            className={`absolute top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 hover:bg-white/5 hover:text-slate-300 ${
              isRtl ? "left-3" : "right-3"
            }`}
            aria-label={t("filter.clearSearch")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* تصفية التصنيفات */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-400">
            <ListFilter className="h-4 w-4" />
            {t("filter.category")}
          </span>
          <button
            type="button"
            onClick={() => onChange({ ...filter, category: "" })}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${
              filter.category === ""
                ? "border-primary bg-primary/15 text-primary"
                : "border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200"
            }`}
          >
            {t("filter.all")}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange({ ...filter, category: c.id })}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${
                filter.category === c.id
                  ? "border-primary bg-primary/15 text-primary"
                  : `border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200`
              }`}
            >
              {lang === "en" ? c.labelEn : c.labelAr}
            </button>
          ))}
        </div>

        {/* تصفية الحالة */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-slate-400">{t("filter.status")}</label>
          <select
            value={filter.status}
            onChange={(e) =>
              onChange({ ...filter, status: e.target.value as ServiceStatus | "" })
            }
            className="input-dark w-auto cursor-pointer"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value} className="bg-night-900">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
