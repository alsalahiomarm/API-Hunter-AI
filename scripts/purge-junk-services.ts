/**
 * تنقية قاعدة البيانات من نتائج البحث التي ليست خدمات API.
 *
 * قبل تفعيل «بوّابة الجودة» (packages/bot-core/src/quality.ts) كان المحرك يخزّن
 * أي نتيجة بحث حيّة كبطاقة خدمة — بما فيها منشورات فيسبوك، فيديوهات يوتيوب،
 * ومقالات على Medium. هذا السكربت يحذف تلك الصفوف.
 *
 * الاستخدام:
 *   npm run db:purge-junk -- --dry     # معاينة فقط (بلا حذف)
 *   npm run db:purge-junk              # حذف فعلي
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

const rootEnv = resolve(process.cwd(), ".env");
if (existsSync(rootEnv)) loadEnv({ path: rootEnv, quiet: true });

import { prisma } from "@apihunter/db";
import { isJunkAutoRow } from "@apihunter/bot-core/quality";

const dry = process.argv.slice(2).includes("--dry");

interface Row {
  id: string;
  name: string;
  slug: string;
  activationLink: string;
  sourceUrl?: string | null;
}

/**
 * سبب الرفض — للتوضيح في التقرير.
 *
 * مهم: نستهدف الصفوف **الآلية** وحدها (أي صفّ ليس ضمن قائمة البذرة المنسّقة).
 * بعض الخدمات المنسّقة يدوياً رابط تفعيلها على نطاق يقع في قائمة منصّات المحتوى
 * (مثل `t.me/BotFather` لـ Telegram Bot API) وهي صحيحة تماماً — فلا يجوز حذفها.
 *
 * ملاحظة: `isJunkAutoRow` يقبل أيضاً الصفوف الآلية التي **يمكن استرجاع اسمها** من
 * رابط خدمة حقيقي (مثل خدمة مخزّنة بعنوان منشور HackerNews)، فلا تُحذف بل تُعرض
 * باسمها المستعاد عبر `displayServiceName`.
 */
function rejectReason(row: Row): string | null {
  if (!isJunkAutoRow(row)) return null;
  return row.activationLink || null;
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("❌ DATABASE_URL غير محدد — لا يمكن تنقية قاعدة البيانات.");
    console.error("   اضبط الرابط في .env أو نفّذ: npm run db:link -- \"postgresql://...\"");
    process.exit(1);
  }

  console.log(`🧹 تنقية قاعدة البيانات${dry ? " (معاينة فقط — بلا حذف)" : ""}…\n`);

  let rows: Row[] = [];
  try {
    rows = (await prisma.apiService.findMany({
      select: { id: true, name: true, slug: true, activationLink: true, sourceUrl: true },
    })) as Row[];
  } catch (err) {
    console.error("❌ تعذّر قراءة الخدمات:", (err as Error).message);
    process.exit(1);
  }

  console.log(`📦 إجمالي الخدمات في قاعدة البيانات: ${rows.length}`);

  const junk = rows
    .map((r) => ({ row: r, link: rejectReason(r) }))
    .filter((x): x is { row: Row; link: string } => x.link !== null);

  if (!junk.length) {
    console.log("✅ لا توجد صفوف مخالفة — كل الخدمات روابط خدمات حقيقية.");
    return;
  }

  console.log(`\n🚫 صفوف مخالفة (${junk.length}):`);
  for (const { row, link } of junk) {
    console.log(`   • ${row.name.slice(0, 60)}`);
    console.log(`     slug: ${row.slug}`);
    console.log(`     رابط مخالف: ${link.slice(0, 100)}`);
  }

  if (dry) {
    console.log(`\nℹ️ معاينة فقط. للحذف الفعلي نفّذ بدون --dry.`);
    return;
  }

  const ids = junk.map((j) => j.row.id);
  try {
    // منع تعليق الحذف على قيود المنشورات: نمسح سجل منشورات القناة المرتبط أولاً
    const posts = await prisma.channelPost.deleteMany({ where: { serviceId: { in: ids } } });
    const deleted = await prisma.apiService.deleteMany({ where: { id: { in: ids } } });
    console.log(`\n🗑️  حُذف ${deleted.count} خدمة مخالفة` + (posts.count ? ` و ${posts.count} منشوراً مرتبطاً` : "") + ".");
  } catch (err) {
    console.error("❌ فشل الحذف:", (err as Error).message);
    process.exit(1);
  }

  const remaining = await prisma.apiService.count();
  console.log(`✅ المتبقي في قاعدة البيانات: ${remaining} خدمة نظيفة.`);
}

main()
  .catch((err) => {
    console.error("❌ خطأ عام:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });