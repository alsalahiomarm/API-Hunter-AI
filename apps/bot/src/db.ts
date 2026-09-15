import type { Category, ServiceRecord } from "@apihunter/db";
import { seedServices } from "@apihunter/db/seed-data";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";

/**
 * طبقة البيانات الخاصة بالبوت:
 * - Prisma عند وجود قناة اتصال وDATABASE_URL.
 * - احتياطي: البيانات التجريبية + ملفات محلية لسجل المنشورات والاستعلامات.
 */

const POSTED_FILE = join(process.cwd(), "posted.json");
const LOG_FILE = join(process.cwd(), "user-logs.json");

/** تُقيَّم وقت التنفيذ: .env يُحمَّل في index.ts بعد استيراد هذه الوحدة */
function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

interface PostedLog {
  serviceIds: string[];
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    if (existsSync(file)) return JSON.parse(await readFile(file, "utf-8"));
  } catch { /* تجاهل */ }
  return fallback;
}

async function writeJson(file: string, data: unknown) {
  await mkdir(dirname(file), { recursive: true }).catch(() => {});
  await writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

// ---------------- جلب الخدمات ----------------
export async function fetchServices(filter?: {
  category?: Category | "";
  search?: string;
}): Promise<ServiceRecord[]> {
  let services: ServiceRecord[] = [];

  if (isDbConfigured()) {
    try {
      const db = await import("@apihunter/db");
      const rows = await db.prisma.apiService.findMany({
        where: filter?.category
          ? { category: filter.category }
          : undefined,
        orderBy: { createdAt: "desc" },
      });
      services = rows.map(db.toPublicService);
    } catch (err) {
      console.warn("[bot/db] قاعدة البيانات غير متاحة - وضع تجريبي.", (err as Error).message);
    }
  }

  if (services.length === 0) services = seedServices;

  const q = (filter?.search ?? "").trim().toLowerCase();
  if (q) {
    services = services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.provider.toLowerCase().includes(q) ||
        s.slug.includes(q)
    );
  }
  return services;
}

export async function fetchLatest(limit = 3): Promise<ServiceRecord[]> {
  const all = await fetchServices();
  return all.slice(0, limit);
}

// ---------------- سجل منشورات القناة (منع التكرار) ----------------
export async function isAlreadyPosted(serviceId: string): Promise<boolean> {
  if (isDbConfigured()) {
    try {
      const db = await import("@apihunter/db");
      const post = await db.prisma.channelPost.findFirst({
        where: { serviceId },
      });
      return Boolean(post);
    } catch { /* تجاهل */ }
  }
  const log = await readJson<PostedLog>(POSTED_FILE, { serviceIds: [] });
  return log.serviceIds.includes(serviceId);
}

export async function markPosted(
  serviceId: string,
  chatId: string,
  messageId: number
) {
  if (isDbConfigured()) {
    try {
      const db = await import("@apihunter/db");
      await db.prisma.channelPost.create({
        data: { serviceId, chatId, messageId },
      });
      return;
    } catch { /* تجاهل */ }
  }
  const log = await readJson<PostedLog>(POSTED_FILE, { serviceIds: [] });
  if (!log.serviceIds.includes(serviceId)) {
    log.serviceIds.push(serviceId);
    await writeJson(POSTED_FILE, log);
  }
}

// ---------------- سجل استفسارات المستخدمين ----------------
export interface UserLogRow {
  telegramId: string;
  firstName: string | null;
  username: string | null;
  query: string;
  intent: string;
  matched: string[];
  at: string;
}

export async function logUserQuery(params: {
  telegramId: string;
  firstName?: string | null;
  username?: string | null;
  query: string;
  intent: string;
  matched: string[];
}) {
  const { telegramId, firstName, username, query, intent, matched } = params;
  if (isDbConfigured()) {
    try {
      const db = await import("@apihunter/db");
      await db.prisma.userLog.create({
        data: {
          telegramId,
          firstName,
          username,
          query,
          intent,
          response: { matched },
        },
      });
      return;
    } catch { /* تجاهل */ }
  }
  const file = await readJson<UserLogRow[]>(LOG_FILE, []);
  file.push({
    telegramId,
    firstName: firstName ?? null,
    username: username ?? null,
    query,
    intent,
    matched,
    at: new Date().toISOString(),
  });
  await writeJson(LOG_FILE, file);
}