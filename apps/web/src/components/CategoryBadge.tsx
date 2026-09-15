import { categoryMeta } from "@/lib/categories";
import CategoryIcon from "@/components/CategoryIcon";
import type { Category } from "@apihunter/db";

export function CategoryBadge({ category }: { category: Category }) {
  const meta = categoryMeta(category);
  return (
    <span className={`badge ${meta.badge}`}>
      <CategoryIcon category={category} className="h-3 w-3" />
      {meta.labelAr}
    </span>
  );
}