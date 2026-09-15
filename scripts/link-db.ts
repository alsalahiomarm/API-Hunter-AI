/**
 * ربط قاعدة بيانات Supabase (أو أي PostgreSQL) بالنظام بالكامل بأمر واحد.
 *
 * الخطوات التي ينفّذها:
 *   1) يتحقق من صحة رابط الاتصال فعلياً (SELECT 1)
 *   2) يحدّث DATABASE_URL في ملف .env المحلي
 *   3) يحدّث متغير البيئة في Vercel (production)
 *   4) يحدّث السر في GitHub Actions
 *   5) يدفع المخطط ويزرع البيانات (npm run draw:seed)
 *   6) (اختياري) يعيد النشر إلى Vercel
 *
 * الاستخدام:
 *   npm run db:link -- "postgresql://postgres.xxxx:PASSWORD@host:6543/postgres?pgbouncer=true&connection_limit=1"
 *   npm run db:link -- --url="postgresql://..." --deploy
 *   npm run db:link -- --url="<transaction pooler 6543>" --migrate-url="<session pooler 5432>"
 *   npm run db:link -- --from-json=tmp-db-urls.json --deploy
 *   npm run db:link -- --url="postgresql://..." --skip-vercel --skip-gh
 *
 * ملاحظات لـ Supabase:
 *   - `--url` يُوضع في Vercel/GitHub (Transaction Pooler 6543 + pgbouncer=true&connection_limit=1).
 *   - `--migrate-url` يُوضع في .env ويُستخدم في db push/seed (Session Pooler 5432 يدعم DDL).
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { execFileSync, spawnSync } from "child_process";

const rootEnv = resolve(process.cwd(), ".env");
if (existsSync(rootEnv)) loadEnv({ path: rootEnv, quiet: true });

const args = process.argv.slice(2);
const hasFlag = (name: string) => args.includes(`--${name}`);
const flagValue = (name: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const skipVercel = hasFlag("skip-vercel");
const skipGh = hasFlag("skip-gh");
const skipSeed = hasFlag("skip-seed");
const doDeploy = hasFlag("deploy");

function log(icon: string, msg: string) {
  console.log(`${icon} ${msg}`.trim());
}

function resolveUrl(): string {
  const raw = flagValue("url") ?? args.find((a) => !a.startsWith("--")) ?? "";
  const url = raw.trim().replace(/^["']|["']$/g, "");
  if (!url) {
    console.error("❌ لم تُمرّر رابط الاتصال.");
    console.error('   الاستخدام: npm run db:link -- "postgresql://user:pass@host:5432/db"');
    process.exit(1);
  }
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    console.error("❌ الرابط يجب أن يبدأ بـ postgresql:// أو postgres://");
    process.exit(1);
  }
  if (!url.includes("@") || url.split("@")[0].split(":").length < 3) {
    console.error("❌ الرابط يفتقد اسم المستخدم أو كلمة المرور (user:password@host).");
    process.exit(1);
  }
  if (/@(localhost|127\.0\.0\.1)/i.test(url)) {
    console.error("❌ هذا رابط محلي (localhost). استخدم رابط Supabase السحابي.");
    process.exit(1);
  }
  return url;
}
/** يختبر الاتصال فعلياً عبر Prisma برابط صريح (قبل أي تعديل على الملفات) */
async function testConnection(url: string) {
  const { PrismaClient } = await import("@prisma/client");
  const client = new PrismaClient({ datasources: { db: { url } } });
  try {
    await client.$queryRaw`SELECT 1`;
    log("✅", "الاتصال بقاعدة البيانات ناجح.");
  } catch (err) {
    const raw = (err as Error).message.split("\n").filter(Boolean);
    console.error(`❌ تعذّر الاتصال بقاعدة البيانات: ${raw[raw.length - 1] ?? ""}`);
    console.error("   تأكد من كلمة المرور، وأن مشروع Supabase غير مُوقَف (Paused).");
    process.exit(1);
  } finally {
    await client.$disconnect().catch(() => {});
  }
}

/** تحديث DATABASE_URL في ملف .env المحلي */
function writeLocalEnv(url: string) {
  if (!existsSync(rootEnv)) {
    writeFileSync(rootEnv, `DATABASE_URL="${url}"\n`, "utf8");
    log("ℹ️", "أُنشئ ملف .env وأُضيف DATABASE_URL.");
    return;
  }
  const before = readFileSync(rootEnv, "utf8");
  const line = `DATABASE_URL="${url}"`;
  const after = /^DATABASE_URL=.*$/m.test(before)
    ? before.replace(/^DATABASE_URL=.*$/m, line)
    : `${before.trimEnd()}\n${line}\n`;
  writeFileSync(rootEnv, after, "utf8");
  log("📝", "تم تحديث DATABASE_URL في ملف .env");
}

function run(
  command: string,
  commandArgs: string[],
  input?: string,
  env?: NodeJS.ProcessEnv
) {
  return spawnSync(command, commandArgs, {
    shell: true,
    stdio: input === undefined ? "inherit" : ["pipe", "inherit", "inherit"],
    input,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}
/** تحديث متغير البيئة في Vercel (production) */
function updateVercel(url: string) {
  log("▲", "تحديث DATABASE_URL في Vercel (production)…");
  run("vercel", ["env", "rm", "DATABASE_URL", "production", "-y"]);
  const res = run("vercel", ["env", "add", "DATABASE_URL", "production"], `${url}\n`);
  if (res.status !== 0) {
    console.error("❌ فشل تحديث Vercel. نفّذ يدوياً: vercel env add DATABASE_URL production");
    return;
  }
  log("✅", "تم تحديث Vercel.");
}

/** تحديث السر في GitHub Actions */
function updateGitHub(url: string) {
  log("🐙", "تحديث سر DATABASE_URL في GitHub Actions…");
  try {
    execFileSync("gh", ["secret", "set", "DATABASE_URL", "--body", url], { stdio: "inherit" });
    log("✅", "تم تحديث GitHub Actions.");
  } catch {
    console.error('❌ فشل تحديث سر GitHub. نفّذ يدوياً: gh secret set DATABASE_URL --body "..."');
  }
}
/** دفع المخطط + زرع البيانات */
function pushSchemaAndSeed(url: string) {
  log("🗄️", "دفع المخطط وزرع البيانات (prisma db push + seed)…");
  const res = run("npm", ["run", "draw:seed"], undefined, { DATABASE_URL: url });
  if (res.status !== 0) {
    console.error("❌ فشل دفع المخطط/الزرع. راجع الأخطاء أعلاه.");
    process.exit(1);
  }
  log("✅", "المخطط مدفوع والبيانات مزروعة.");
}

/** يقرأ الروابط من ملف JSON (--from-json) أو من الوسائط المباشرة */
function resolveUrls(): { url: string; migrateUrl: string } {
  const fromJson = flagValue("from-json")?.trim();
  if (fromJson) {
    const p = resolve(process.cwd(), fromJson);
    if (!existsSync(p)) {
      console.error(`❌ لا يوجد ملف: ${fromJson}`);
      process.exit(1);
    }
    const data = JSON.parse(readFileSync(p, "utf8")) as Record<string, string>;
    const url = (data.runtime ?? data.url ?? data.DATABASE_URL ?? "").trim();
    const migrateUrl = (data.migrate ?? data.migrateUrl ?? url).trim();
    if (!url) {
      console.error("❌ الملف لا يحتوي المفاتيح runtime أو url.");
      process.exit(1);
    }
    return { url, migrateUrl };
  }
  const url = resolveUrl();
  return { url, migrateUrl: flagValue("migrate-url")?.trim() || url };
}

async function main() {
  const { url, migrateUrl } = resolveUrls();
  const mask = (u: string) => u.replace(/:\/\/([^:]+):[^@]+@/, "://$1:****@");
  log("🔗", `رابط التشغيل (Vercel/GitHub): ${mask(url)}`);
  if (migrateUrl !== url) log("🔗", `رابط المخطط (.env + db push): ${mask(migrateUrl)}`);

  await testConnection(url);
  if (migrateUrl !== url) await testConnection(migrateUrl);
  writeLocalEnv(migrateUrl);

  if (!skipVercel) updateVercel(url);
  if (!skipGh) updateGitHub(url);
  if (!skipSeed) pushSchemaAndSeed(migrateUrl);

  if (doDeploy) {
    log("🚀", "إعادة النشر إلى Vercel (production)…");
    run("vercel", ["--prod", "--yes"]);
  } else if (!skipVercel) {
    log("ℹ️", "بعد الانتهاء نفّذ: vercel --prod لإعادة النشر وتطبيق المتغيّر الجديد.");
  }

  if (!skipVercel) log("🧪", "للتحقق بعد النشر: npm run env:check");
  log("🎉", "تم ربط قاعدة البيانات — سيعمل البوت الآن ببيانات حقيقية متنوعة.");
}

main().catch((err) => {
  console.error("❌ فشل الربط:", err);
  process.exit(1);
});