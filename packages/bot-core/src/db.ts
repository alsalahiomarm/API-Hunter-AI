import type { Category, ServiceRecord, ServiceStatus } from "@apihunter/db";
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
  try {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    // بيئات بلا حالة (Vercel) نظام ملفاتها للقراءة فقط - نكتفي بالتحذير
    console.warn(
      "[bot-core/db] تعذّر الكتابة في الملف المحلي:",
      (err as Error).message
    );
  }
}

/**
 * فحص فعلي لقابلية الوصول لقاعدة البيانات.
 * يُستخدم قبل النشر للقناة لضمان عمل منع التكرار (ChannelPost) وعدم تكرار المنشورات.
 */
export async function isDatabaseReachable(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    const db = await import("@apihunter/db");
    await db.prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// نسخة مُخزَّنة مؤقتاً لتجنب إبطاء كل رسالة بفحص قاعدة البيانات
let probe: { at: number; ok: boolean } | null = null;

export async function isDatabaseReachableCached(ttlMs = 60000): Promise<boolean> {
  if (probe && Date.now() - probe.at < ttlMs) return probe.ok;
  const ok = await isDatabaseReachable();
  probe = { at: Date.now(), ok };
  return ok;
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

// ---------------- ذاكرة محادثات البوت (سياق متصل لكل مستخدم) ----------------
export interface ChatMemoryEntry {
  role: "user" | "assistant";
  content: string;
}

// احتياطي ذاكرة في الذاكرة (عند غياب قاعدة البيانات أو في البيئات عديمة الحالة)
const chatMem = new Map<string, ChatMemoryEntry[]>();

export async function saveChatMessage(
  telegramId: string,
  role: "user" | "assistant",
  content: string
) {
  const text = content.trim().slice(0, 4000);
  if (!text) return;
  if (isDbConfigured()) {
    try {
      const db = await import("@apihunter/db");
      await db.prisma.chatMessage.create({
        data: { telegramId, role, content: text },
      });
      return;
    } catch { /* نكمل نحو الذاكرة المحلية */ }
  }
  const arr = chatMem.get(telegramId) ?? [];
  arr.push({ role, content: text });
  if (arr.length > 40) arr.shift();
  chatMem.set(telegramId, arr);
}

/** آخر المحادثة بترتيبها الزمني (الأقدم أولاً) — تُرسل للنموذج في كل طلب */
export async function getChatHistory(
  telegramId: string,
  limit = 16
): Promise<ChatMemoryEntry[]> {
  if (isDbConfigured()) {
    try {
      const db = await import("@apihunter/db");
      const rows = await db.prisma.chatMessage.findMany({
        where: { telegramId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows
        .reverse()
        .map((r: { role: string; content: string }) => ({
          role: r.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: r.content,
        }));
    } catch { /* نكمل نحو الذاكرة المحلية */ }
  }
  const arr = chatMem.get(telegramId) ?? [];
  return arr
    .slice(-limit)
    .map(({ role, content }) => ({ role, content }));
}

export async function clearChatHistory(telegramId: string) {
  chatMem.delete(telegramId);
  if (!isDbConfigured()) return;
  try {
    const db = await import("@apihunter/db");
    await db.prisma.chatMessage.deleteMany({ where: { telegramId } });
  } catch { /* تجاهل */ }
}

/** حفظ خدمة مكتشفة من البحث في الإنترنت في قاعدة البيانات */
export async function saveDiscoveredService(input: {
  name: string;
  slug: string;
  provider: string;
  category: Category;
  description: string;
  freeTier: Record<string, any>;
  activationLink: string;
  documentationLink: string;
  codeExample: string;
  status: ServiceStatus;
}): Promise<ServiceRecord | null> {
  try {
    if (isDbConfigured()) {
      const db = await import("@apihunter/db");
      // تجنب التكرار بالاسم
      const existing = await db.prisma.apiService.findFirst({ where: { name: input.name } });
      if (existing) return db.toPublicService(existing);

      const created = await db.prisma.apiService.create({
        data: {
          name: input.name,
          slug: input.slug,
          provider: input.provider,
          category: input.category,
          description: input.description,
          freeTierDetails: input.freeTier,
          activationLink: input.activationLink,
          documentationLink: input.documentationLink,
          codeExample: input.codeExample,
          status: input.status,
        },
      });
      return db.toPublicService(created);
    }
  } catch (err) {
    console.warn("[db] تعذّر حفظ الخدمة المكتشفة:", (err as Error).message);
  }
  return null;
}

export async function logUserQuery({
  telegramId,
  firstName,
  username,
  query,
  intent,
  matched,
}: {
  telegramId: string;
  firstName?: string | null;
  username?: string | null;
  query: string;
  intent: string;
  matched: string[];
}) {
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