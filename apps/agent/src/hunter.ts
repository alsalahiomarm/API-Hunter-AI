import { SOURCES, type Source } from "./sources";
import { crawlSource } from "./crawler";
import { analyzeEntry } from "./analyzer";
import { isCandidate, isLinkHealthy, dedupeKey } from "./validator";
import { persistHuntResults } from "./store";
import type { HuntResult, HuntSummary, RawEntry } from "./types";

/** تنفيذ مهام غير متزامنة بعدد محدود متوازٍ */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

export interface HuntConfig {
  /** تحديد مصادر محددة بالـ id */
  sources?: string[];
  /** حد أقصى للمدخلات المراد تحليلها */
  maxEntries?: number;
  /** تخطي فحص الروابط (أسرع) */
  skipLinkCheck?: boolean;
  /** توازي التحليل */
  concurrency?: number;
}

export async function runHunt(cfg: HuntConfig = {}): Promise<HuntSummary> {
  const startedAt = new Date();
  const t0 = Date.now();
  const concurrency = cfg.concurrency ?? 4;
  const maxEntries = cfg.maxEntries ?? 0;

  const sourceList: Source[] = cfg.sources?.length
    ? SOURCES.filter((s) => cfg.sources!.includes(s.id))
    : SOURCES;

  console.log("══════════════════════════════════════════════");
  console.log(`🦾  بدء جولة اصطياد | المصادر: ${sourceList.length}`);
  console.log("══════════════════════════════════════════════");

  // 1) الكشط
  let entries: RawEntry[] = [];
  for (const src of sourceList) {
    const got = await crawlSource(src);
    console.log(`  📡 ${src.label.padEnd(38)} -> ${got.length} مدخل`);
    entries = entries.concat(got);
  }

  // 2) فلترة المرشحين
  let candidates = entries.filter(isCandidate);
  console.log(`دخل: ${entries.length} | مرشحون بعد الفلترة: ${candidates.length}`);

  // 3) التحليل الذكي
  let analyzed = 0;
  const results: HuntResult[] = [];
  const analyzedRaw = await mapLimit(candidates.slice(0, maxEntries || undefined), concurrency, async (e) => {
    const r = await analyzeEntry(e);
    return { e, r };
  });
  for (const { e, r } of analyzedRaw) {
    if (!r) continue;
    analyzed++;
    (r as any).label = e.source; // توضيح المصدر في السجل
    results.push(r);
  }
  console.log(`تحليل: ${analyzed} نتيجة مرشحة للتخزين`);

  // 4) إزالة التكرار داخل نفس الدفعة + فحص الروابط
  const seen = new Set<string>();
  const finalResults: HuntResult[] = [];
  for (const r of results) {
    const key = dedupeKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!cfg.skipLinkCheck) {
      const healthy = await isLinkHealthy(r.activationLink);
      if (!healthy) {
        console.warn(`  ❌ رابط غير سليم: ${r.name} (${r.activationLink})`);
        continue;
      }
    }
    finalResults.push(r);
  }

  // 5) التخزين
  const { inserted, duplicates } = await persistHuntResults(finalResults);

  const durationMs = Date.now() - t0;
  const summary: HuntSummary = {
    scanned: entries.length,
    candidates: candidates.length,
    analyzed,
    newServices: inserted.length,
    duplicates,
    failed: results.length - finalResults.length,
    startedAt,
    durationMs,
  };
  printSummary(summary);
  return summary;
}

function printSummary(s: HuntSummary) {
  console.log("──────────────────────────────────────────────");
  console.log("📊 ملخص الجولة:");
  console.log(`   مدخلات مفحوصة        : ${s.scanned}`);
  console.log(`   مرشحون بعد الفلترة   : ${s.candidates}`);
  console.log(`   نتائج محللة          : ${s.analyzed}`);
  console.log(`   ✔  خدمات جديدة      : ${s.newServices}`);
  console.log(`   مكررة / مرفوضة       : ${s.duplicates} / ${s.failed}`);
  console.log(`   الزمن                : ${(s.durationMs / 1000).toFixed(1)} ثانية`);
}