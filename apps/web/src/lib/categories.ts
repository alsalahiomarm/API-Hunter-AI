import type { Category, ServiceStatus } from "@apihunter/db";

// ---------- تعريفات التصنيفات ----------
export interface CategoryMeta {
  id: Category;
  labelAr: string;
  labelEn: string;
  badge: string;
  chip: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "AI_MODELS",
    labelAr: "نماذج ذكاء اصطناعي",
    labelEn: "AI Models",
    badge: "bg-cyan-500/15 text-cyan-300 ring-cyan-400/30",
    chip: "text-cyan-300 border-cyan-400/40 hover:bg-cyan-400/10",
  },
  {
    id: "SEARCH_TOOLS",
    labelAr: "أدوات البحث",
    labelEn: "Search APIs",
    badge: "bg-violet-500/15 text-violet-300 ring-violet-400/30",
    chip: "text-violet-300 border-violet-400/40 hover:bg-violet-400/10",
  },
  {
    id: "AUDIO_IMAGE",
    labelAr: "صوت وصورة",
    labelEn: "Audio & Image",
    badge: "bg-pink-500/15 text-pink-300 ring-pink-400/30",
    chip: "text-pink-300 border-pink-400/40 hover:bg-pink-400/10",
  },
  {
    id: "DATABASES",
    labelAr: "قواعد بيانات",
    labelEn: "Databases",
    badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
    chip: "text-emerald-300 border-emerald-400/40 hover:bg-emerald-400/10",
  },
  {
    id: "DEV_TOOLS",
    labelAr: "أدوات تطوير",
    labelEn: "Dev Tools",
    badge: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
    chip: "text-amber-300 border-amber-400/40 hover:bg-amber-400/10",
  },
  {
    id: "OTHER",
    labelAr: "أخرى",
    labelEn: "Other",
    badge: "bg-slate-500/15 text-slate-300 ring-slate-400/30",
    chip: "text-slate-300 border-slate-400/40 hover:bg-slate-400/10",
  },
];

export function categoryMeta(cat: Category): CategoryMeta {
  return CATEGORIES.find((c) => c.id === cat) ?? CATEGORIES[CATEGORIES.length - 1];
}

// ---------- حالات الخدمة ----------
export const STATUS_META: Record<
  ServiceStatus,
  { labelAr: string; labelEn: string; badge: string }
> = {
  FREE_TIER: { labelAr: "مجاني بالكامل", labelEn: "Fully Free", badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" },
  FREE_CREDIT: { labelAr: "رصيد مجاني", labelEn: "Free Credit", badge: "bg-sky-500/15 text-sky-300 ring-sky-400/30" },
  TRIAL: { labelAr: "تجربة مؤقتة", labelEn: "Trial", badge: "bg-amber-500/15 text-amber-300 ring-amber-400/30" },
  PENDING: { labelAr: "قيد التحقق", labelEn: "Verifying", badge: "bg-slate-500/15 text-slate-300 ring-slate-400/30" },
  VERIFIED: { labelAr: "موثّد", labelEn: "Verified", badge: "bg-violet-500/15 text-violet-300 ring-violet-400/30" },
  FAILED: { labelAr: "فشل التحقق", labelEn: "Failed", badge: "bg-red-500/15 text-red-300 ring-red-400/30" },
};

export function statusMeta(status: ServiceStatus) {
  return STATUS_META[status] ?? STATUS_META.PENDING;
}
