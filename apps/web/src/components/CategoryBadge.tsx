import { categoryMeta } from "@/lib/categories";
import CategoryIcon from "@/components/CategoryIcon";
import type { Category } from "@apihunter/db";
import { useI18n } from "@/lib/i18n";

export function CategoryBadge({ category, lang = "ar" }: { category: Category; lang?: "ar" | "en" }) {
  const meta = categoryMeta(category);
  const label = lang === "en" ? meta.labelEn : meta.labelAr;

  return (
    <span className={`badge ${meta.badge}`}>
      <CategoryIcon category={category} className="h-3 w-3" />
      {label}
    </span>
  );
}
