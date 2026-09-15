"use client";

import { Search, X, ListFilter } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
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

const STATUS_OPTIONS: { value: ServiceStatus | ""; label: string }[] = [
  { value: "", label: "كل الحالات" },
  { value: "FREE_TIER", label: "مجاني بالكامل" },
  { value: "FREE_CREDIT", label: "رصيد مجاني" },
  { value: "TRIAL", label: "تجربة مؤقتة" },
  { value: "VERIFIED", label: "موثّقة" },
];

export default function FilterBar({ filter, onChange }: Props) {
  return (
    <div className="space-y-4">
      {/* شريط البحث */}
      <div className="relative">
        <Search className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={filter.search}
          onChange={(e) => onChange({ ...filter, search: e.target.value })}
          placeholder="ابحث باسم الخدمة أو الشركة... مثال: Gemini، Tavily، Groq"
          className="input-dark pr-11 py-3 text-base"
          aria-label="بحث"
        />
        {filter.search && (
          <button
            type="button"
            onClick={() => onChange({ ...filter, search: "" })}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 hover:bg-white/5 hover:text-slate-300"
            aria-label="مسح البحث"
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
            التصنيف:
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
            الكل
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
              {c.labelAr}
            </button>
          ))}
        </div>

        {/* تصفية الحالة */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-slate-400">الحالة:</label>
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