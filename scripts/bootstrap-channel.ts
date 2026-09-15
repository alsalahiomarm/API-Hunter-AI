/**
 * سكربت تهيئة البوت والقناة:
 * 1) التحقق من صحة توكن البوت والقناة.
 * 2) ترقية المستخدم المحدد (TELEGRAM_ADMIN_IDS أو --uid=1665333044) إلى
 *    منصب مدير في القناة (يتطلب أن يكون البوت مديراً في القناة).
 * 3) إرسال رسالة ترحيب خاصة للمدير من البوت.
 *
 * التشغيل: npm run bootstrap
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

const cwdEnv = resolve(process.cwd(), ".env");
const rootEnv = resolve(process.cwd(), "../../.env");
loadEnv({ path: cwdEnv, quiet: true });
if (existsSync(rootEnv)) loadEnv({ path: rootEnv, quiet: true });

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
if (!TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN غير محدد في .env");
  process.exit(1);
}

function argValue(flag: string): string {
  return (
    process.argv.find((a) => a.startsWith(`${flag}=`))?.split("=")[1] ?? ""
  );
}

const uid = Number(argValue("--uid") || process.env.TELEGRAM_ADMIN_IDS || 0);
const channelId =
  argValue("--channel") || process.env.TELEGRAM_CHANNEL_ID?.trim() || "";

if (!uid) {
  console.error("❌ لم يُحدد معرف المستخدم المدير (ضعه في TELEGRAM_ADMIN_IDS أو --uid=123)");
  process.exit(1);
}
if (!channelId) {
  console.error("❌ لم يُحدد معرف القناة (ضعه في TELEGRAM_CHANNEL_ID)");
  process.exit(1);
}

const api = `https://api.telegram.org/bot${TOKEN}/`;

async function call(method: string, params: Record<string, unknown>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    body.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  const res = await fetch(api + method, { method: "POST", body });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) {
    console.error(`   ❌ ${method} فشل: ${JSON.stringify(json.description ?? json)}`);
    return null;
  }
  return json.result;
}

async function main() {
  console.log("🚀 تهيئة البوت والقناة...");

  // 1) التحقق من البوت والقناة
  const me = await call("getMe", {});
  console.log(me ? `   ✅ البوت: @${me.username}` : "   ❌ تعذّر التحقق من البوت");

  const chat = await call("getChat", { chat_id: channelId });
  console.log(chat ? `   ✅ القناة: ${chat.title} (${chat.id})` : "   ❌ تعذّر الوصول للقناة");

  // 2) ترقية المدير داخل القناة
  const promoted = await call("promoteChatMember", {
    chat_id: channelId,
    user_id: uid,
    can_manage_chat: true,
    can_post_messages: true,
    can_edit_messages: true,
    can_delete_messages: true,
    can_invite_users: true,
    can_restrict_members: true,
    can_pin_messages: true,
    can_promote_members: true,
    can_change_info: true,
    is_anonymous: false,
  });
  console.log(
    promoted
      ? `   ✅ أصبح المستخدم ${uid} مديراً في القناة`
      : "   ⚠️ لم يتم الترقية — تأكد أن البوت مدير في القناة ويملك صلاحية إضافة مدراء."
  );

  // 3) رسالة ترحيب خاصة للمدير
  const welcomer = await call("sendMessage", {
    chat_id: uid,
    text:
      "👋 أهلاً بك مديرَ API-HUNTER AI!\n\n" +
      "✅ البوت والقناة مُجهزان وجاهزان.\n" +
      "🪤 سيُرسل البوت اكتشافات مفاتيح الـ API المجانية إلى القناة تلقائياً.\n\n" +
      "أوامر سريعة داخل الدردشة: /latest  /search gemini  /categories",
  });
  console.log(
    welcomer
      ? `   ✅ أُرسلت رسالة الترحيب للمدير ${uid}`
      : "   ⚠️ لم تُرسل رسالة الترحيب — ربما لم يبدأ المستخدم المحادثة مع البوت."
  );

  console.log("\n🏁 اكتمل التهيئة.");
}

main().catch((e) => {
  console.error("❌ خطأ عام:", e);
  process.exit(1);
});