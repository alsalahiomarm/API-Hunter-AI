import { runHunt, type HuntConfig } from "./hunter";

/**
 * المجدول اليومي: ينفذ دورة بحث بشكل دوري (افتراضياً كل 6 ساعات).
 */
export function startScheduler(hours: number, cfg: HuntConfig = {}) {
  const intervalMs = Math.max(hours, 0.1) * 3600_000;

  console.log(`⏰ جدول البحث مفعّل: دورة كل ${hours} ساعة.`);

  // تشغيل فوري ثم تكرار
  runHunt(cfg)
    .then(() => console.log(`✅ انتهت الجولة الأولى. الجولة القادمة بعد ${hours}h`))
    .catch((e) => console.error("❌ فشل الجولة الأولى:", e.message));

  const timer = setInterval(async () => {
    try {
      console.log(`\n⏱️  بدء دورة مجدولة...`);
      await runHunt(cfg);
    } catch (e) {
      console.error("❌ فشل دورة مجدولة:", (e as Error).message);
    }
  }, intervalMs);

  // إبقاء العملية حية وطريقة إيقاف لطيفة
  const shutdown = () => {
    console.log("\n👋 إيقاف المحرك...");
    clearInterval(timer);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}