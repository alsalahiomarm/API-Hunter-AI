import type { Language } from "@/lib/i18n";
import type { ServiceRecord } from "@apihunter/db";

/**
 * قاموس الترجمة للنصوص الحرة القادمة من قاعدة البيانات/الوكيل.
 *
 * المشكلة: وصف الخدمة وبيانات الخطة المجانية (الرصيد، حد الاستخدام، الملاحظات)
 * تأتي من البيانات بنسخة واحدة فقط (عربية أو إنجليزية حسب المصدر)، لذا كان
 * الوصف يظهر بالإنجليزية في الصفحة العربية، والخطة تظهر بالعربية في الصفحة الإنجليزية.
 *
 * الحل: قاموس لكل خدمة (بالمعرّف slug) يوفّر النص باللغتين، مع إرجاع القيمة
 * المخزنة كاحتياط عند غياب الخدمة من القاموس (خدمات جديدة يكتشفها الوكيل).
 */

type ServiceField = "description" | "freeCredits" | "rateLimit" | "notes";

interface ServiceCopy {
  ar: string;
  en: string;
}

interface ServiceStrings {
  description?: ServiceCopy;
  freeCredits?: ServiceCopy;
  rateLimit?: ServiceCopy;
  notes?: ServiceCopy;
}

const SERVICE_I18N: Record<string, ServiceStrings> = {
  // ===================== نماذج الذكاء الاصطناعي =====================
  "google-gemini": {
    description: {
      ar: "واجهة نماذج Gemini العائلية (Flash / Pro) مع طبقة مجانية سخية تدعم الصور والنصوص والصوت.",
      en: "Gemini family models (Flash / Pro) with a generous free tier that supports images, text, and audio.",
    },
    rateLimit: { ar: "15 RPM مجاناً", en: "15 RPM free" },
    freeCredits: { ar: "طبقة مجانية دائمة بدون بطاقة", en: "Permanent free tier, no card" },
    notes: {
      ar: "أنشئ مفتاحاً من Google AI Studio ثم مرّره في الكود.",
      en: "Create a key from Google AI Studio and pass it in your code.",
    },
  },
  "groq-cloud": {
    description: {
      ar: "تشغيل نماذج مفتوحة (Llama 3.3, Mixtral) بسرعة فائقة عبر رقاقات LPU مع طبقة مجانية سخية.",
      en: "Run open models (Llama 3.3, Mixtral) at blazing speed on LPU chips with a generous free tier.",
    },
    freeCredits: { ar: "طبقة مجانية دائمة بدون بطاقة", en: "Permanent free tier, no card" },
    notes: {
      ar: "مثالية للنماذج الأولية والـ chatbots بلا أي تكلفة.",
      en: "Great for prototypes and chatbots at zero cost.",
    },
  },
  "mistral-la-plateforme": {
    description: {
      ar: "نماذج Mistral 7B / 8x7B مع خطة تجريب مجانية للتطوير والتجريب.",
      en: "Mistral 7B / 8x7B models with a free experimental plan for development and testing.",
    },
    freeCredits: { ar: "خطة Experiment مجانية", en: "Free Experiment plan" },
    notes: {
      ar: "بعد استهلاك الحصة تتحول تلقائياً إلى خطة مدفوعة - راقب الاستهلاك.",
      en: "Once you exhaust the quota, it switches to a paid plan automatically — keep an eye on usage.",
    },
  },

  // ===================== أدوات البحث =====================
  "tavily-search": {
    description: {
      ar: "بحث محسّن للذكاء الاصطناعي مع نتائج منظمة (تشرح الروابط وتلخصها) - مثالية للـ RAG والوكلاء.",
      en: "AI-optimized search with structured results (explains and summarizes links) — ideal for RAG and agents.",
    },
    rateLimit: { ar: "1000 رصيد/شهر", en: "1000 credits/month" },
    freeCredits: { ar: "1000 رصيد شهرياً", en: "1000 credits monthly" },
    notes: {
      ar: "الرصيد يتجدد شهرياً بدون بطاقة ائتمان.",
      en: "Credits renew monthly with no credit card.",
    },
  },
"serper-search": {
    description: {
      ar: "واجهة Google Search API السريعة (نتائج ويب، أخبار، صور) مصممة للذكاء الاصطناعي.",
      en: "Fast Google Search API (web, news, images) built for AI.",
    },
    rateLimit: { ar: "2500 بحث مجاني", en: "2500 free searches" },
    freeCredits: { ar: "2500 بحث مجاني", en: "2500 free searches" },
    notes: {
      ar: "تحتاج التسجيل بالبريد فقط للحصول على المفتاح.",
      en: "Just sign up with email to get the key.",
    },
  },
  "exa-search": {
    description: {
      ar: "بحث معنوي (Semantic & Neural) في الويب، متخصص للوكلاء والبحث العلمي.",
      en: "Semantic & neural web search tailored for agents and research.",
    },
    rateLimit: { ar: "محدود", en: "Limited" },
    freeCredits: { ar: "$10 رصيد مجاني عند التسجيل", en: "$10 free credit on signup" },
    notes: {
      ar: "رصيد ترحيبي يُمنح بعد تفعيل الحساب (قد يتطلب توثيق).",
      en: "Welcome credit granted after account activation (may require verification).",
    },
  },
  "brave-search": {
    description: {
      ar: "بحث مستقل يحترم الخصوصية من محرك Brave، مع طبقة مجانية كبيرة ونتائج نظيفة دون إعلانات.",
      en: "Privacy-respecting independent search from Brave with a large free tier and clean, ad-free results.",
    },
    rateLimit: { ar: "2000 استعلام/شهر", en: "2000 queries/month" },
    freeCredits: { ar: "2000 استعلام شهرياً", en: "2000 queries monthly" },
    notes: {
      ar: "اضبط خطة Free ثم أنشئ مفتاحاً من Developer Dashboard.",
      en: "Set a Free plan, then create a key from the Developer Dashboard.",
    },
  },
  serpapi: {
    description: {
      ar: "كشط نتائج Google وBing وYouTube (نتائج، خرائط، منتجات) عبر واجهة رسمية واحدة.",
      en: "Scrape Google, Bing, and YouTube results (web, maps, shopping) through one official API.",
    },
    rateLimit: { ar: "100 بحث مجاني", en: "100 free searches" },
    freeCredits: { ar: "100 بحث مجاني", en: "100 free searches" },
    notes: {
      ar: "الطبقة المجانية محدودة؛ مثالية لاختبار الواجهة.",
      en: "Free tier is limited; great for testing the API.",
    },
  },
  "duckduckgo-instant-answer": {
    description: {
      ar: "بحث فوري وملخصات وإجابات بلا مفتاح إطلاقاً - يعمل عالمياً ولا يحتاج تسجيلاً أو بطاقة.",
      en: "Instant answers and summaries with no API key at all — works worldwide, no signup or card needed.",
    },
    rateLimit: { ar: "بدون مفتاح (استخدام عادل)", en: "No key (fair use)" },
    freeCredits: { ar: "مجاني بالكامل وبدون API key", en: "Completely free, no API key" },
    notes: {
      ar: "مثالي كبديل فوري عندما تكون خدمات البحث الأخرى محجوبة في بلدك.",
      en: "Perfect instant alternative when other search services are blocked in your country.",
    },
  },
  "google-programmable-search": {
    description: {
      ar: "محرك بحث مخصص من Google: أنشئ محركاً (cx) واستعلم بنتائج ويب وصور من مفتاحك الخاص.",
      en: "Custom Google search engine: create an engine (cx) and query web and image results with your own key.",
    },
    rateLimit: { ar: "100 استعلام/يوم", en: "100 queries/day" },
    freeCredits: { ar: "100 استعلام مجاناً يومياً", en: "100 free queries daily" },
    notes: {
      ar: "المفتاح من Google Cloud Console + معرّف محرك البحث (cx) من لوحة Programmable Search.",
      en: "Key from Google Cloud Console + search engine ID (cx) from the Programmable Search panel.",
    },
  },
"zenserp-search": {
    description: {
      ar: "نتائج بحث ويب وصور وأخبار من Google بشكل JSON بسيط - حصة مجانية شهرية للمطورين.",
      en: "Google web, image, and news results as simple JSON — with a monthly free quota for developers.",
    },
    rateLimit: { ar: "50 بحث/شهر", en: "50 searches/month" },
    freeCredits: { ar: "50 بحث مجاناً شهرياً", en: "50 free searches monthly" },
    notes: {
      ar: "يسجّل بالبريد فقط؛ مناسب للاختبارات الخفيفة.",
      en: "Email signup only; suited for light testing.",
    },
  },
  "searchapi-io": {
    description: {
      ar: "واجهة تجمع نتائج Google و Bing و YouTube وغيرها بصيغة JSON موحّدة مع حصة مجانية شهرية.",
      en: "An API aggregating Google, Bing, YouTube, and more into unified JSON with a monthly free quota.",
    },
    rateLimit: { ar: "100 بحث/شهر", en: "100 searches/month" },
    freeCredits: { ar: "100 بحث مجاناً شهرياً", en: "100 free searches monthly" },
    notes: {
      ar: "الحصة قد تتغير؛ راجع لوحة الحساب قبل الاستخدام المكثّف.",
      en: "Quota may change; check the account dashboard before heavy use.",
    },
  },
  "wikimedia-rest": {
    description: {
      ar: "بحث في ويكيبيديا والبيانات الوصفية والمحتوى الحر عبر REST - بدون مفتاح ولا بطاقة.",
      en: "Search Wikipedia, metadata, and free content via REST — no key and no card required.",
    },
    rateLimit: { ar: "بدون مفتاح (استخدام عادل)", en: "No key (fair use)" },
    freeCredits: { ar: "مجاني بالكامل وبدون مفتاح", en: "Completely free, no key" },
    notes: {
      ar: "أضف User-Agent واضحاً للاستخدام الكثيف حسب سياسة Wikimedia.",
      en: "Set a clear User-Agent for heavy use per Wikimedia policy.",
    },
  },
  "openverse-api": {
    description: {
      ar: "بحث في ملايين الصور والصوتيات الحرة (CC) بدون مفتاح - ممتاز لتغذية المشاريع بالوسائط.",
      en: "Search millions of free (CC) images and audio without a key — great for sourcing media for projects.",
    },
    rateLimit: { ar: "بدون مفتاح (استخدام عادل)", en: "No key (fair use)" },
    freeCredits: { ar: "مجاني بالكامل وبدون مفتاح", en: "Completely free, no key" },
    notes: {
      ar: "التسجيل اختياري ويرفع الحصة فقط.",
      en: "Registration is optional and only raises the quota.",
    },
  },
  "internet-archive": {
    description: {
      ar: "بحث في أرشيف الإنترنت والمواقع المؤرشفة (Wayback Machine) - بيانات ضخمة بلا مفتاح.",
      en: "Search the Internet Archive and archived sites (Wayback Machine) — massive open data with no key.",
    },
    rateLimit: { ar: "بدون مفتاح (استخدام عادل)", en: "No key (fair use)" },
    freeCredits: { ar: "مجاني بالكامل وبدون مفتاح", en: "Completely free, no key" },
    notes: {
      ar: "مناسب للتحقق من الروابط الميتة وإيجاد نسخ مؤرشفة.",
      en: "Great for checking dead links and finding archived copies.",
    },
  },
  "openalex-api": {
    description: {
      ar: "بحث أكاديمي مفتوح (ملايين الأوراق والمؤلفين والمؤسسات) بدون مفتاح - مثالي للوكلاء البحثية.",
      en: "Open scholarly search (millions of works, authors, and institutions) with no key — ideal for research agents.",
    },
    rateLimit: { ar: "بدون مفتاح (Polite pool بالبريد)", en: "No key (Polite pool via email)" },
    freeCredits: { ar: "مجاني بالكامل وبدون مفتاح", en: "Completely free, no key" },
    notes: {
      ar: "أضف بريدك في param mailto للحصول على أولوية الاستجابة.",
      en: "Add your email to the mailto param for faster response priority.",
    },
  },
  "algolia-search": {
    description: {
      ar: "بحث كن-خدمة (Search-as-a-Service): فهرسة بياناتك وتقديم بحث فوري فائق السرعة من موقعك أو تطبيقك.",
      en: "Search-as-a-Service: index your data and serve blazing-fast instant search from your site or app.",
    },
    rateLimit: { ar: "10,000 طلب/شهر", en: "10,000 requests/month" },
    freeCredits: { ar: "طبقة مجانية دائمة (10k طلبات/شهر)", en: "Permanent free tier (10k requests/month)" },
    notes: {
      ar: "تحتاج إنشاء تطبيق ثم استخدام App ID + Search-Only API Key.",
      en: "Create an app, then use the App ID + Search-Only API Key.",
    },
  },
  "firecrawl-search": {
    description: {
      ar: "بحث وزحف وتحويل صفحات الويب إلى Markdown جاهز للـ LLM - رصيد مجاني للمطورين.",
      en: "Search, crawl, and convert web pages to LLM-ready Markdown — free credits for developers.",
    },
    rateLimit: { ar: "رصيد مجاني محدود", en: "Limited free credits" },
    freeCredits: { ar: "رصيد مجاني عند التسجيل (500 نقطة تقريباً)", en: "Free credits on signup (~500 credits)" },
    notes: {
      ar: "أفضل مؤشر عند حجب واجهات البحث التقليدية: يعمل من خوادم Firecrawl.",
      en: "Best when traditional search APIs are blocked: runs from Firecrawl's servers.",
    },
  },
// ===================== الصوت والصورة =====================
  elevenlabs: {
    description: {
      ar: "توليد أصوات بشرية فائقة الواقعية + تحويل النص للكلام (TTS) وصوت إلى نص (STT).",
      en: "Ultra-realistic human voice generation + text-to-speech (TTS) and speech-to-text (STT).",
    },
    rateLimit: { ar: "10k رصيد/شهر", en: "10k credits/month" },
    freeCredits: { ar: "10 آلاف رصيد شهرياً", en: "10,000 credits monthly" },
    notes: {
      ar: "الرصيد يكفي ~10 دقائق توليد صوت شهرياً.",
      en: "Credits cover ~10 minutes of generated audio per month.",
    },
  },

  // ===================== قواعد البيانات والتخزين =====================
  supabase: {
    description: {
      ar: "بديل مفتوح لـ Firebase: قاعدة PostgreSQL كاملة + مصادقة + تخزين ملفات + Realtime مجاناً.",
      en: "Open-source Firebase alternative: full PostgreSQL + auth + file storage + Realtime for free.",
    },
    rateLimit: { ar: "500MB قاعدة + مصادقة 50K مستخدم", en: "500MB database + 50K-user auth" },
    freeCredits: { ar: "مشروع مجاني دائم", en: "Free project forever" },
    notes: {
      ar: "المشاريع المجانية تتجمد بعد أسبوع خمول - يمكن إيقاظها يدوياً.",
      en: "Free projects pause after a week of inactivity — you can wake them manually.",
    },
  },
  "neon-postgres": {
    description: {
      ar: "قاعدة PostgreSQL سحابية بدون خادم مع فرع بيانات (Branching) وأدوات تنبؤ ذكي للتوسع.",
      en: "Serverless cloud PostgreSQL with data branching and smart scaling preview tools.",
    },
    rateLimit: { ar: "0.5GB تخزين + 190 ساعة حساب", en: "0.5GB storage + 190 compute hours" },
    freeCredits: { ar: "خطة Free دائمة", en: "Permanent Free plan" },
    notes: {
      ar: "مناسب للمشاريع الشخصية والتطوير مع تشغيل/إيقاف تلقائي.",
      en: "Great for personal projects and development with auto pause/resume.",
    },
  },
  upstash: {
    description: {
      ar: "Redis السحابي وQStash (طوابير رسائل من serverless) بطبقات مجانية سخية للمطورين.",
      en: "Cloud Redis and QStash (serverless message queues) with generous free tiers for developers.",
    },
    rateLimit: { ar: "10K أمر/يوم", en: "10K commands/day" },
    freeCredits: { ar: "خطة Free دائمة", en: "Permanent Free plan" },
    notes: {
      ar: "حد أقصى تخزين 256MB في الطبقة المجانية.",
      en: "256MB storage cap on the free tier.",
    },
  },

  // ===================== أدوات التطوير والبنية =====================
  "telegram-bot-api": {
    description: {
      ar: "واجهة رسائل تليجرام الرسمية: مجانية بالكامل وغير محدودة للبوتات - أساس أي تكامل أوتوماتيكي.",
      en: "Telegram's official messaging API: completely free and unlimited for bots — the backbone of any automation.",
    },
    rateLimit: { ar: "30 req/sec تقريباً", en: "~30 req/sec" },
    freeCredits: { ar: "مجاني 100%", en: "100% free" },
    notes: {
      ar: "كوّن بوتك من @BotFather ولا تحتاج أي بطاقة.",
      en: "Create your bot with @BotFather — no card needed.",
    },
  },
  "vercel-ai": {
    description: {
      ar: "سكّ المطورين الرسمي لبناء تطبيقات LLM موحدة عبر مزودين كثيرين، مع استضافة Edge مجانية.",
      en: "The official developer kit for building unified LLM apps across many providers, with free Edge hosting.",
    },
    rateLimit: { ar: "100GB عرض يومياً", en: "100GB bandwidth daily" },
    freeCredits: { ar: "Hobby Plan مجاني", en: "Free Hobby Plan" },
    notes: {
      ar: "خطة Hobby تسمح بنشر مشاريع لامحدودة بدون بطاقة.",
      en: "The Hobby plan lets you deploy unlimited projects without a card.",
    },
  },
};

/**
 * إرجاع نص الخدمة (وصف/رصيد/حد استخدام/ملاحظات) باللغة المطلوبة.
 * عند غياب الخدمة من القاموس تُرجَع القيمة المخزنة كما هي (احتياط آمن).
 */
export function serviceText(
  slug: string,
  field: ServiceField,
  lang: Language,
  fallback: string | null | undefined
): string {
  if (!fallback) return "";
  const entry = SERVICE_I18N[slug];
  const copy = entry?.[field];
  if (copy && copy[lang]) return copy[lang];
  return fallback;
}

/** وصف الخدمة باللغة الحالية مع احتياط للقيمة المخزنة. */
export function localizedDescription(s: ServiceRecord, lang: Language): string {
  return serviceText(s.slug, "description", lang, s.description);
}