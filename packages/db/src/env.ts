/**
 * تحميل متغيّرات البيئة من جذر المستودع عند التشغيل المباشر (tsx).
 * يُستورد كأول شيء في نقاط الدخول كي تكون DATABASE_URL جاهزة قبل إنشاء PrismaClient.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

const candidates = [
  resolve(process.cwd(), ".env"), // التشغيل من جذر المستودع
  resolve(process.cwd(), "../../.env"), // التشغيل من داخل packages/db
  resolve(process.cwd(), "../../../.env"),
];

for (const p of candidates) {
  if (existsSync(p)) {
    loadEnv({ path: p, quiet: true });
    break;
  }
}