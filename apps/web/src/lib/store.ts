import type { Category, ServiceRecord, ServiceStatus } from "@apihunter/db";
import { seedServices } from "@apihunter/db/seed-data";

/**
 * طبقة الوصول للبيانات:
 * - عند توفر DATABASE_URL مع Prisma -> القراءة من قاعدة البيانات.
 * - عند غيابها -> إرجاع البيانات التجريبية (لتجربة الواجهة فوراً).
 */

export interface ServiceFilters {
  search?: string;
  category?: Category | "";
  status?: ServiceStatus | "";
}

const DB_CONFIGURED = Boolean(process.env.DATABASE_URL);

function applyFilters(list: ServiceRecord[], f: ServiceFilters): ServiceRecord[] {
  const q = (f.search ?? "").trim().toLowerCase();
  let out = list.slice();

  if (q) {
    out = out.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.provider.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }
  if (f.category) out = out.filter((s) => s.category === f.category);
  if (f.status) out = out.filter((s) => s.status === f.status);

  // الأحدث أولاً ثم الموثّقة
  return out.sort((a, b) => {
    const at = new Date(a.createdAt).getTime();
    const bt = new Date(b.createdAt).getTime();
    if (at !== bt) return bt - at;
    return (a.status === "VERIFIED" ? 0 : 1) - (b.status === "VERIFIED" ? 0 : 1);
  });
}

export async function getAllServices(
  filters: ServiceFilters = {}
): Promise<ServiceRecord[]> {
  if (DB_CONFIGURED) {
    try {
      const db = await import("@apihunter/db");
      const rows = await db.prisma.apiService.findMany({
        orderBy: { createdAt: "desc" },
      });
      const services: ServiceRecord[] = rows.map(db.toPublicService);
      return applyFilters(services, filters);
    } catch (err) {
      console.warn(
        "[store] قاعدة البيانات غير متاحة الآن، العودة للبيانات التجريبية.",
        (err as Error)?.message ?? err
      );
    }
  }
  return applyFilters(seedServices, filters);
}

export async function getStats() {
  const all = await getAllServices();
  const uniqueProviders = new Set(all.map((s) => s.provider)).size;
  return {
    total: all.length,
    freeTier: all.filter((s) => s.status === "FREE_TIER").length,
    freeCredit: all.filter((s) => s.status === "FREE_CREDIT").length,
    providers: uniqueProviders,
  };
}

/** أحدث عروض اليوم (للقسم التعريفي) */
export async function getLatest(limit = 3): Promise<ServiceRecord[]> {
  const all = await getAllServices();
  return all.slice(0, limit);
}