import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import type { HuntResult } from "./types";
import { dedupeKey } from "./validator";

/**
 * التخزين النهائي للنتائج:
 * 1) عند توفر قاعدة البيانات -> upsert عبر Prisma.
 * 2) عند غيابها -> ملف محلي captured.json (سجل تدريجي للاكتشافات).
 */

const FALLBACK_FILE = join(process.cwd(), "captured.json");
const DB_CONFIGURED = Boolean(process.env.DATABASE_URL);

export interface PersistOutcome {
  inserted: HuntResult[];
  duplicates: number;
}

export async function persistHuntResults(results: HuntResult[]): Promise<PersistOutcome> {
  const inserted: HuntResult[] = [];
  let duplicates = 0;

  if (DB_CONFIGURED) {
    try {
      const db = await import("@apihunter/db");
      for (const r of results) {
        const slug = dedupeKey(r);
        if (!slug) continue;
        const existing = await db.prisma.apiService.findUnique({ where: { slug } });
        if (existing) {
          duplicates++;
          continue;
        }
        await db.prisma.apiService.create({
          data: {
            slug,
            name: r.name,
            provider: r.provider || r.name,
            category: r.category,
            description: r.description || "اكتشفه وكيل الاصطياد تلقائياً.",
            freeTierDetails: r.freeTier as unknown as object,
            activationLink: r.activationLink,
            documentationLink: r.documentationLink ?? r.activationLink,
            codeExample: r.codeExample,
            status: (r.freeTier?.requiresCard ? "TRIAL" : "FREE_TIER") as any,
            sourceUrl: r.sourceUrl,
          },
        });
        inserted.push(r);
      }
      return { inserted, duplicates };
    } catch (err) {
      console.warn(
        "⚠️ [store] قاعدة البيانات غير متاحة حالياً، الكتابة لملف محلي.",
        (err as Error).message
      );
      // استمراراً نحو الملف المحلي
    }
  }

  // -------- التخزين الاحتياطي في ملف JSON --------
  let previous: HuntResult[] = [];
  try {
    if (existsSync(FALLBACK_FILE)) {
      previous = JSON.parse(await readFile(FALLBACK_FILE, "utf-8"));
    }
  } catch {
    previous = [];
  }

  const known = new Set(previous.map((p) => dedupeKey(p)));
  for (const r of results) {
    const slug = dedupeKey(r);
    if (known.has(slug)) {
      duplicates++;
      continue;
    }
    known.add(slug);
    inserted.push(r);
    previous.push(r);
  }

  await mkdir(dirname(FALLBACK_FILE), { recursive: true }).catch(() => {});
  await writeFile(FALLBACK_FILE, JSON.stringify(previous, null, 2), "utf-8");
  return { inserted, duplicates };
}