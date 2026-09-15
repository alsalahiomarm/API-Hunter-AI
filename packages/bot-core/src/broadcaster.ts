import type { Telegraf } from "telegraf";
import type { ServiceRecord } from "@apihunter/db";
import { fetchServices, isAlreadyPosted, markPosted } from "./db";
import { channelKeyboard, formatServiceFull, STATUS_LABEL } from "./formatter";

/**
 * المذياع: يفحص قاعدة البيانات دورياً ويرسل المنشورات الجديدة للقناة.
 * يضمن عدم التكرار عبر جدول ChannelPost / الملف المحلي.
 */

/** قائمة الخدمات التي لم تُنشر بعد (لمعاينة ما سيُنشر بدون إرسال فعلي) */
export async function listPendingServices(): Promise<ServiceRecord[]> {
  const services = await fetchServices();
  const pending: ServiceRecord[] = [];
  for (const s of services) {
    if (await isAlreadyPosted(s.id)) continue;
    pending.push(s);
  }
  return pending;
}

export async function publishPendingToChannel(
  bot: Telegraf,
  channelId: string,
  /** حد أقصى لعدد المنشورات في الدفعة الواحدة (لمنع إغراق القناة) */
  max?: number
) {
  if (!channelId) {
    console.warn("⚠️ [broadcaster] TELEGRAM_CHANNEL_ID غير محدد - تخطي النشر.");
    return 0;
  }
  const services = await fetchServices();
  let published = 0;

  for (const s of services) {
    if (max && published >= max) break;
    if (await isAlreadyPosted(s.id)) continue;

    const statusBadge = STATUS_LABEL[s.status] ?? s.status;
    const text = [
      `🆕 <b>اكتشاف جديد من الصيّاد!</b>`,
      ``,
      formatServiceFull(s),
      ``,
      `📊 الحالة: ${statusBadge}`,
      `⏰ ${new Date().toLocaleString("ar-EG")}`,
    ].join("\n");

    try {
      const msg = await bot.telegram.sendMessage(channelId, text, {
        parse_mode: "HTML",
        reply_markup: channelKeyboard(s),
      });
      await markPosted(s.id, channelId, msg.message_id);
      published++;
      console.log(`📣 نُشر للقناة: ${s.name}`);
    } catch (err) {
      console.error(`❌ فشل نشر ${s.name}:`, (err as Error).message);
    }
  }

  return published;
}

/** دفعة إرسال قائمة خدمات محددة */
export async function pushServicesToChannel(
  bot: Telegraf,
  channelId: string,
  services: ServiceRecord[]
) {
  for (const s of services) {
    try {
      await bot.telegram.sendMessage(channelId, formatServiceFull(s), {
        parse_mode: "HTML",
        reply_markup: channelKeyboard(s),
      });
    } catch (err) {
      console.error(`❌ فشل إرسال ${s.name}:`, (err as Error).message);
    }
  }
}