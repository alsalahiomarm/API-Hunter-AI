// أنوع محلية (غير معتمدة على Prisma Client المُولَّد) - تطابق قيم Prisma Enums بالضبط

export type Category =
  | "AI_MODELS"
  | "SEARCH_TOOLS"
  | "AUDIO_IMAGE"
  | "DATABASES"
  | "DEV_TOOLS"
  | "OTHER";

export type ServiceStatus =
  | "FREE_TIER"
  | "FREE_CREDIT"
  | "TRIAL"
  | "PENDING"
  | "VERIFIED"
  | "FAILED";

// ---------- بنية تفاصيل الخطة المجانية ----------
export interface FreeTierDetails {
  monthlyRequests?: number | null;
  dailyRequests?: number | null;
  freeCredits?: string | null; // مثال: "$10 free credit"
  rateLimit?: string | null;
  models?: string[];
  notes?: string | null;
  requiresCard?: boolean;
}

// ---------- المحول من صف Prisma إلى الشكل العام ----------

/** نوع الصف كما يُرجع Prisma (مع freeTierDetails كـ Json) */
export interface ApiServiceRow {
  id: string;
  name: string;
  slug: string;
  provider: string;
  category: Category;
  description: string;
  freeTierDetails: unknown;
  activationLink: string;
  documentationLink: string;
  codeExample: string | null;
  status: ServiceStatus;
  verifiedAt: Date | null;
  sourceUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicService(row: ApiServiceRow): ServiceRecord {
  const ftd =
    typeof row.freeTierDetails === "object" && row.freeTierDetails
      ? (row.freeTierDetails as Partial<FreeTierDetails>)
      : {};

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    provider: row.provider,
    category: row.category,
    description: row.description,
    freeTier: {
      monthlyRequests: ftd.monthlyRequests ?? null,
      dailyRequests: ftd.dailyRequests ?? null,
      freeCredits: ftd.freeCredits ?? null,
      rateLimit: ftd.rateLimit ?? null,
      models: ftd.models ?? [],
      notes: ftd.notes ?? null,
      requiresCard: ftd.requiresCard ?? false,
    },
    activationLink: row.activationLink,
    documentationLink: row.documentationLink,
    codeExample: row.codeExample ?? "",
    status: row.status,
    verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
    sourceUrl: row.sourceUrl,
    createdAt: row.createdAt.toISOString(),
  };
}
export interface ServiceRecord {
  id: string;
  name: string;
  slug: string;
  provider: string;
  category: Category;
  description: string;
  freeTier: FreeTierDetails;
  activationLink: string;
  documentationLink: string;
  codeExample: string;
  status: ServiceStatus;
  verifiedAt?: string | null;
  sourceUrl?: string | null;
  createdAt: string;
}