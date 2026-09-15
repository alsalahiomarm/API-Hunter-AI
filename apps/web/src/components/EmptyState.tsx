import { Radar } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25">
        <Radar className="h-7 w-7" />
      </span>
      <h3 className="text-lg font-black text-white">لا توجد نتائج مطابقة</h3>
      <p className="max-w-sm text-sm leading-6 text-slate-400">
        جرّب تغيير كلمات البحث أو إزالة الفلاتر، أو أرجع لاحقاً - الوكيل يبحث
        باستمرار عن خدمات جديدة.
      </p>
    </div>
  );
}