import type { Category, FreeTierDetails } from "@apihunter/db";

/** مدخل أولي خام من أي مصدر */
export interface RawEntry {
  title: string;
  url: string;
  source: string;
  text: string;
  publishedAt?: string;
}

/** نتيجة تحليل لخدمة محتملة */
export interface HuntResult {
  name: string;
  provider: string;
  category: Category;
  description: string;
  freeTier: FreeTierDetails;
  activationLink: string;
  documentationLink: string;
  codeExample: string | null;
  sourceUrl: string | null;
  confidence: number; // 0..1
}

export interface HuntSummary {
  scanned: number; // مدخلات خام
  candidates: number; // مرشحة بعد الفلترة
  analyzed: number; // تم تحليلها
  newServices: number; // جديدة وتسلمت للتخزين
  duplicates: number;
  failed: number;
  startedAt: Date;
  durationMs: number;
}