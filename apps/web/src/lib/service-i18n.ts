import type { Language } from "@/lib/i18n";
import type { ServiceRecord } from "@apihunter/db";

/**
 * قاموس الترجمة للنصوص الحرة القادمة من قاعدة البيانات/الوكيل.
 *
 * المشكلة: وصف الخدمة وبيانات الخطة المجانية (الرصيد، حد الاستخدام، الملاحظات)
 * تأتي من البيانات بنسخة واحدة فقط (عربية أو إنجليزية حسب المصدر)، لذا كان
 * الوصف يظهر بالإنجليزية في الصفحة العربية، والخطة تظهر بالعربية في الصفحة الإنجليزية.
 *
 * الحل: ترتيب أولويات موحّد عند طلب أي نص:
 *   1) قاموس الخدمة SERVICE_I18N (بالمعرّف slug) — الترجمة المعتمدة لكل خدمة.
 *   2) قاموس العبارات PHRASE_I18N — قيم الرصيد القصيرة المتكررة في البيانات.
 *   3) ترجمة ملاحظات الاكتشاف الآلي: "مصدر الاكتشاف: X" تتحول إلى "Source: X".
 *   4) احتياط القيمة المخزنة، مع منع ظهور نص بلغة تخالف لغة الصفحة.
 *
 * صيانة: كل خدمة جديدة يكتشفها الوكيل يُضاف لها وصف عربي (ar) هنا؛ وإلا ظهر
 * تنبيه "الترجمة العربية قريباً" في الصفحة العربية بدل نص إنجليزي.
 */

type ServiceField = "description" | "freeCredits" | "rateLimit" | "notes";

interface ServiceCopy {
  ar: string;
  /**
   * اختيارية: عند غيابها تُستخدم القيمة المخزنة في قاعدة البيانات.
   * (الخدمات المكتشفة آلياً أوصافها مخزّنة بالإنجليزية أصلاً، فلا حاجة لتكرارها.)
   */
  en?: string;
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

  // ===================== خدمات مكتشفة آلياً (ترجمات يدوية) =====================

  // الأوصاف مخزّنة بالإنجليزية في قاعدة البيانات، لذا تكفي الترجمة العربية (ar)
  // هنا، وتُضاف (en) عند الحاجة لتنظيف نص المصدر أو تصحيح لغة مخزّنة.  //

  "admin-console-api-key-isolation-4-limits-for-internal-logistics-spend": {
    description: {
      ar: "عزل مفاتيح API في لوحة التحكم: خصّص مفتاحاً ضيق الصلاحيات لكل مستخدم، وأبقِه منفصلاً عن بيانات الإنتاج مع تدوير دوري وتتبّع للاستخدام.",
      en: "A guide to API key isolation in an internal logistics console: give the console its own narrowly scoped key, separate it from the production credential, rotate both on schedule, and attribute usage per key.",
    },
  },
  "aviationstack": {
    description: {
      ar: "واجهة عالمية لتتبع الطائرات والرحلات والخطوط الجوية والمطارات في الوقت الفعلي، مناسبة لمنصات السفر وتطبيقات تتبع الرحلات.",
      en: "A reliable travel API for tracking flights, airlines, airports, routes, and schedules worldwide — built for travel platforms, flight tracking apps, and logistics tools.",
    },
  },
  "media-billing-after-a-leaked-api-key-evidence-preserving-compromise-report-runb": {
    description: {
      ar: "درس تقني عن التعامل مع تسريب مفاتيح API في أنظمة الفوترة: أوقف الصلاحية فوراً واحفظ الأدلة لحساب الفوترة بدقة.",
      en: "How to handle a leaked API key in billing systems: revoke access immediately while preserving evidence so media events are still billed correctly.",
    },
  },
  "oddsbench": {
    description: {
      ar: "قياس أداء شهري مستقل لواجهات احتمالات الرهانات الرياضية، مع بيانات JSON وCSV مجانية.",
    },
  },
  "framejet": {
    description: {
      ar: "واجهة لالتقاط لقطات شاشة للمواقع مع إزالة لافتات الكوكيز ونوافذ الدردشة، بطبقة مجانية.",
    },
  },
  "an-image-to-video-ai-tutorial-for-developers-tired-of-juggling-five-different-ap": {
    description: {
      ar: "درس تقني عن تحويل الصور إلى فيديو عبر واجهات الذكاء الاصطناعي بلا الحاجة لإدارة عدة مفاتيح مختلفة.",
      en: "A step-by-step image-to-video AI tutorial for developers who are tired of juggling several providers and API keys.",
    },
  },
  "how-to-implement-function-calling-with-structured-outputs": {
    description: {
      ar: "دليل لتطبيق استدعاء الدوال (Function Calling) والنواتج المنظمة في نماذج اللغة.",
      en: "A guide to implementing function calling (tool use) with structured outputs so models return machine-usable data instead of free text.",
    },
  },
  "runyankole-bible-api": {
    description: {
      ar: "واجهة برمجة تطبيقات REST مجانية للكتاب المقدس بلغة رونيانكوري-روكيجا (Runyankore-Rukiga)، تتضمن 66 سفراً و31,106 آية.",
      en: "Free REST API for the Runyankore-Rukiga Bible — 66 books, 31,106 verses.",
    },
  },
  "top-10-developer-tools-apis-scrapers-in-2026": {
    description: {
      ar: "قائمة بأفضل 10 أدوات وواجهات وبرامج كشط للمطورين في 2026 حسب عدد المستخدمين.",
      en: "The top 10 most popular developer tools, APIs, and scrapers on Apify in 2026, ranked by active users.",
    },
  },
  "ipstack": {
    description: {
      ar: "واجهة تحديد الموقع الجغرافي للعنوان IP في الوقت الفعلي مع أكثر من 100 حقل تشمل الموقع ومزود الخدمة والمنطقة الزمنية.",
      en: "Real-time IP geolocation API with 100+ data fields including location, ISP, timezone, currency, and security threat detection.",
    },
  },
  "best-finance-apis-for-developers-in-2026": {
    description: {
      ar: "أفضل واجهات البيانات المالية للمطورين لعام 2026 من منصة APILayer.",
      en: "The best finance data APIs for developers on APILayer in 2026, including real-time, intraday, and historical market data.",
    },
  },
  "building-a-full-stack-e-commerce-site-google-oauth-apis-and-real-world-problem": {
    description: {
      ar: "درس عملي عن بناء متجر إلكتروني متكامل باستخدام OAuth من Google وواجهات برمجية ومشاكل واقعية.",
      en: "A practical walkthrough of building a full-stack e-commerce site with Google OAuth, Supabase, Netlify, and real-world problem solving.",
    },
  },
  "how-to-scrape-any-social-media-platform-in-2026": {
    description: {
      ar: "دليل كشط بيانات منصات التواصل الاجتماعي في 2026 للبحث والتسويق وتدريب نماذج الذكاء الاصطناعي.",
      en: "The best tools for scraping social media platforms in 2026 for research, marketing, and AI training — without maintaining your own proxy infrastructure.",
    },
  },
  "freelancer-api": {
    description: {
      ar: "واجهة برمجة تطبيقات تتيح التفاعل برمجياً مع منصة Freelancer لإدارة المشاريع، تصفح الوظائف، والتوظيف.",
      en: "An API to interact programmatically with the Freelancer platform: manage projects, browse jobs, and hire.",
    },
  },
  "upres": {
    description: {
      ar: "خدمة رفع جودة ودقة الصور بالذكاء الاصطناعي حتى دقة 8K باستخدام 18 نموذجاً مختلفاً.",
      en: "AI image upscaling service up to 8K resolution using 18 different models.",
    },
  },
  "7-smtp-apis-worth-knowing-in-2026-and-where-id-start": {
    description: {
      ar: "سبع واجهات بريد إلكتروني (SMTP) جديرة بالمعرفة في 2026 وأين تبدأ منها.",
      en: "Seven SMTP/email APIs worth knowing in 2026 and where to start with each, based on hands-on use.",
    },
  },
  "find-companies-using-contentful-cms-via-api-2026-guide": {
    description: {
      ar: "دليل لاكتشاف الشركات التي تستخدم نظام Contentful لإدارة المحتوى عبر الواجهة البرمجية (2026).",
      en: "A 2026 guide to finding companies that run the Contentful CMS, discovered through their API.",
    },
  },
  "four-ways-reasoning-models-hide-their-thinking-and-what-that-does-to-your-bill": {
    description: {
      ar: "أربع طرق تخفي بها نماذج التفكير خطواتها، وما تأثير ذلك على فاتورتك.",
      en: "How four reasoning models hide their thinking — four wire formats and billing behaviors that affect your audit trail and your bill.",
    },
  },
  "freetogame": {
    description: {
      ar: "قاعدة بيانات الألعاب المجانية Free-To-Play.",
    },
  },
  "gofile": {
    description: {
      ar: "رفع ملفات بحجم غير محدود مجاناً.",
    },
  },
  "the-dog": {
    description: {
      ar: "خدمة عامة كل ما تريد معرفته عن الكلاب، مجانية للاستخدام في تطبيقاتك ومواقعك.",
    },
  },
  "how-to-validate-phone-numbers-via-api": {
    description: {
      ar: "طريقة التحقق من أرقام الهواتف عبر واجهة برمجية بدلاً من بناء حلول مخصصة مكلفة.",
      en: "How to validate phone numbers via an API instead of building slow custom solutions or paying for overkill enterprise plans.",
    },
  },
  "how-to-get-real-time-stock-market-data-via-api": {
    description: {
      ar: "طريقة الحصول على بيانات سوق الأسهم في الوقت الفعلي عبر واجهة برمجية موثوقة.",
      en: "How to get real-time stock market data via an API for finance apps and trading bots without fragile custom scrapers.",
    },
  },
  "build-a-multi-model-ai-chatbot-in-15-minutes-one-api-key-for-deepseek-glm-and": {
    description: {
      ar: "ابنِ بوت محادثة ذكاء اصطناعي متعدد النماذج في 15 دقيقة بمفتاح واحد لـ DeepSeek وGLM وغيرهما.",
      en: "Build a multi-model AI chatbot in 15 minutes using one API key for DeepSeek, GLM, and other models.",
    },
  },
  "show-hn-jan-nano-4b-agentic-model-that-outperforms-deepseek-v3-671b-using-mcp": {
    description: {
      ar: "نموذج Jan-nano بحجم 4 مليارات معلمة يتفوق على DeepSeek-v3-671B باستخدام MCP لاستدعاء الأدوات.",
      en: "Jan-nano, a 4B model trained for MCP tool use, tops DeepSeek-V3-671B on tool-use benchmarks and handles live web search and multi-step deep research.",
    },
  },
  "show-hn-dyad": {
    description: {
      ar: "أداة مجانية مفتوحة المصدر لبناء تطبيقات الذكاء الاصطناعي محلياً.",
      en: "A free, local, open-source AI app builder you can download and run on your own machine.",
    },
  },
  "show-hn-bullsh-financial-modeling-agent-cli": {
    description: {
      ar: "أداة سطر أوامر مجانية مفتوحة المصدر للتحليل المالي والنمذجة عبر وكيل ذكاء اصطناعي.",
      en: "A free open-source agentic CLI for financial modeling and analysis that queries and stores 10-Qs and 10-Ks in a local vector store.",
    },
  },
  "show-hn-klipy": {
    description: {
      ar: "منصة واجهات برمجية لملفات GIF والملصقات والميمات والمقاطع والمحتوى المولّد بالذكاء الاصطناعي.",
      en: "An API-first platform for GIFs, stickers, memes, emojis, clips, and AI-generated content — a solid alternative as GIPHY goes paid and Tenor shuts down.",
    },
  },
  "show-hn-opik-an-open-source-llm-evaluation-framework": {
    description: {
      ar: "إطار عمل مفتوح المصدر لتقييم نماذج اللغة الكبيرة (LLM).",
      en: "Opik is an open-source framework for evaluating LLM applications, focused on making evals easier to write and maintain.",
    },
  },
  "show-hn-browse-hn-together-in-threejs": {
    description: {
      ar: "تصفّح Hacker News بشكل جماعي في بيئة ثلاثية الأبعاد عبر Three.js.",
      en: "A multiplayer, embeddable virtual computer that lets people browse Hacker News together, including inside 3D spaces built with Three.js.",
    },
  },
  "the-guide-to-free-ai-api-keys-6-platforms-you-need-to-know": {
    description: {
      ar: "دليل مفاتيح الذكاء الاصطناعي المجانية: 6 منصات يجب أن تعرفها.",
    },
  },
  "show-hn-forge": {
    description: {
      ar: "أداة طرفية تجلب الذكاء الاصطناعي إلى بيئة تطويرك لمساعدتك في البرمجة والتصحيح.",
      en: "Forge is a terminal tool that brings AI into your development workflow for coding, debugging, and problem-solving without leaving the command line.",
    },
  },
  "markly": {
    description: {
      ar: "إضافة علامة مائية على الصور من Claude عبر MCP، مجانية وبدون مفتاح API.",
    },
  },
  "a-dex-aggregator-whose-quotes-are-computed-on-chain-free-api-no-key": {
    description: {
      ar: "مجمّع أسعار لامركزي (DEX) تُحتسب أسعاره على السلسلة مباشرة، بواجهة مجانية بدون مفتاح.",
    },
  },
  "show-hn-free-api-keys-for-open-models-llama-qwen-gpt-oss-gemma": {
    description: {
      ar: "مفاتيح API مجانية لنماذج مفتوحة المصدر: Llama وQwen وGPT-OSS وGemma.",
    },
  },
  "were-announcing-an-extension-of-free-twitter-api-access-through-february-13": {
    description: {
      ar: "إعلان عن تمديد الوصول المجاني إلى واجهة تويتر حتى 13 فبراير.",
    },
  },
  "show-hn-free-api-to-block-disposable-emails": {
    description: {
      ar: "واجهة مجانية لحظر البريد الإلكتروني المؤقت (القابل للتخلص).",
    },
  },
  "twitter-replaces-its-free-api-with-a-paid-tier-in-quest-to-make-more-money": {
    description: {
      ar: "تويتر يستبدل واجهته المجانية بخطة مدفوعة بحثاً عن المزيد من الإيرادات.",
    },
  },
  "a-collective-list-of-free-apis": {
    description: {
      ar: "قائمة مجمّعة من الواجهات البرمجية المجانية.",
    },
  },
  "adventures-in-running-a-free-public-api": {
    description: {
      ar: "خبرة عملية في تشغيل وإدارة واجهة برمجية عامة مجانية.",
    },
  },
  "show-hn-free-openai-api-access-with-chatgpt-account": {
    description: {
      ar: "وصول مجاني لواجهة OpenAI من خلال حساب ChatGPT.",
    },
  },
  "textbelt-is-a-free-api-for-outgoing-sms": {
    description: {
      ar: "اكتشفه وكيل الاصطياد تلقائياً.",
      en: "Auto-discovered by the hunting agent.",
    },
  },
  "show-hn-kanyerest": {
    description: {
      ar: "واجهة REST مجانية لاقتباسات Kanye West العشوائية.",
    },
  },
  "google-is-discontinuing-their-free-weather-api": {
    description: {
      ar: "جوجل تُوقف واجهة الطقس المجانية الخاصة بها.",
    },
  },
  "show-hn-i-built-a-free-oembed-api-for-the-web": {
    description: {
      ar: "واجهة oEmbed مجانية لتضمين محتوى الويب في مواقعك.",
    },
  },
  "show-hn-free-api-service-for-crypto-and-foreign-exchange-rates": {
    description: {
      ar: "واجهة مجانية لأسعار العملات الرقمية وأسعار الصرف الأجنبي.",
    },
  },
  "hosted-microsoft-ocr-library-free-ocr-api-web-service": {
    description: {
      ar: "مكتبة OCR من مايكروسوفت مستضافة: واجهة ويب مجانية لاستخراج النصوص من الصور.",
    },
  },
  "hoppscotch": {
    description: {
      ar: "أداة مجانية سريعة لإنشاء واختبار طلبات الواجهات البرمجية.",
    },
  },
  "free-json-api-to-instantly-check-the-spam-score-of-your-email-messages": {
    description: {
      ar: "واجهة JSON مجانية لفحص درجة البريد المزعج في رسائلك فوراً.",
    },
  },
  "public-apis-a-collective-list-of-free-apis": {
    description: {
      ar: "قائمة مجمّعة واسعة من الواجهات البرمجية المجانية.",
    },
  },
  "show-hn-tiny-fast-and-free-api-to-geolocate-ip-addresses": {
    description: {
      ar: "واجهة صغيرة وسريعة ومجانية لتحديد الموقع الجغرافي لعناوين IP.",
    },
  },
  "norwegian-meteorological-institute-has-an-excellent-free-weather-api": {
    description: {
      ar: "المعهد النرويجي للأرصاد الجوية يوفّر واجهة طقس مجانية ممتازة.",
    },
  },
  "decommissioning-a-free-public-api": {
    description: {
      ar: "درس عن إيقاف تشغيل واجهة برمجية عامة مجانية بأمان.",
    },
  },
  "spacetraders-a-multiplayer-game-built-on-a-free-web-api": {
    description: {
      ar: "لعبة متعددة اللاعبين مبنية على واجهة ويب مجانية.",
    },
  },
  "a-collection-of-freepublic-apis-you-can-use-to-build-stuff": {
    description: {
      ar: "مجموعة من الواجهات البرمجية المجانية والعامة لبناء مشاريعك.",
    },
  },
  "a-collection-of-free-public-apis-that-is-tested-daily": {
    description: {
      ar: "مجموعة من الواجهات العامة المجانية تُختبر يومياً.",
    },
  },
  "weather-api": {
    description: {
      ar: "واجهة REST مجانية للاستعلام عن حالة الطقس.",
    },
  },
  "free-url-shortener": {
    description: {
      ar: "مختصر روابط مجاني يقدّم واجهة قوية للتفاعل مع المواقع الأخرى.",
    },
  },
  "postmon": {
    description: {
      ar: "واجهة للاستعلام عن الرموز البريدية البرازيلية ومتابعة الشحنات بسهولة وسرعة ومجاناً.",
    },
  },
  "lecto-translation": {
    description: {
      ar: "واجهة ترجمة بطبقة مجانية وأسعار معقولة.",
    },
  },
  "totalshiftleft-sandbox": {
    description: {
      ar: "بيئة تجريبية متعددة البروتوكولات مجاناً: REST وGraphQL وSOAP مع مصادقة OAuth2/JWT ومواصفة OpenAPI 3.0.",
    },
  },
  "trash-nothing": {
    description: {
      ar: "مجتمع إعادة تدوير يضم آلاف العناصر المجانية المُهداة يومياً.",
    },
  },
  "privacycom": {
    description: {
      ar: "توليد أرقام بطاقات ائتمانية افتراضية مرتبطة بحسابك البنكي لكل متجر على حدة.",
    },
  },
  "iplogs": {
    description: {
      ar: "كشف مجاني لعناوين الـ VPN والبروكسي وTor ومراكز البيانات من 13 مصدراً مع فحص نشط.",
    },
  },
  "share": {
    description: {
      ar: "مجموعة بيانات مجانية ومفتوحة عن الأبحاث والنشاط الأكاديمي.",
    },
  },
  "orbitalwiki": {
    description: {
      ar: "كتالوج لأكثر من 16,000 قمر صناعي يدمج CelesTrak وGCAT وWikidata، مع طبقة مجانية.",
    },
  },
  "pexafy": {
    description: {
      ar: "بحث دلالي عن الصور عبر 9+ مصادر صور مجانية بنظام JSON موحّد.",
    },
  },
  "quotable-quotes": {
    description: {
      ar: "واجهة اقتباسات مجانية ومفتوحة المصدر.",
    },
  },
  "personalityfyi": {
    description: {
      ar: "اختبار مجاني لأنواع الشخصية MBTI وتصحيح اختبارات OEJTS.",
    },
  },
  "tilth": {
    description: {
      ar: "مؤشر أسعار أسمدة يومي مجاني للتسعيرات في بريطانيا عبر تسع درجات، برخصة CC BY 4.0.",
    },
  },
  "open-scholarships": {
    description: {
      ar: "دليل مجاني بمصادر رسمية لمنح الولايات المتحدة الدراسية والمساعدات المالية للطلاب.",
    },
  },
  "noozra": {
    description: {
      ar: "عناوين أخبار مجانية من أكثر من 200 مصدر RSS مُنسّق.",
    },
  },
  "mediastack": {
    description: {
      ar: "واجهة REST مجانية وبسيطة للأخبار الحية ومقالات المدونات.",
    },
  },
  "sunor": {
    description: {
      ar: "واجهة توليد موسيقى بالذكاء الاصطناعي عبر Suno برصيد مرن (ادفع ما تستخدمه).",
    },
  },
  "freesound": {
    description: {
      ar: "مكتبة عينات صوتية وموسيقية مجانية.",
    },
  },
  "messengerxio": {
    description: {
      ar: "واجهة مجانية للمطورين لبناء تطبيقات الدردشة المخصصة بالذكاء الاصطناعي وتحقيق الربح منها.",
    },
  },
  "jina-ai": {
    description: {
      ar: "واجهة ذكاء اصطناعي مجانية للتضمينات (Embeddings) وإعادة الترتيب ومعالجة النصوص.",
    },
  },
  "groq": {
    description: {
      ar: "واجهة استنتاج ذكاء اصطناعي سريعة بطبقة مجانية تدعم نماذج Llama وMixtral وGemma.",
    },
  },
  "ai-for-thai": {
    description: {
      ar: "واجهات ذكاء اصطناعي تايلاندية متنوعة مجانية.",
    },
  },
  "freehire": {
    description: {
      ar: "محرك بحث مفتوح المصدر يجمع وظائف التقنية من لوحات التوظيف الرسمية للشركات.",
    },
  },
  "cure-cancer-with-ai": {
    description: {
      ar: "بيانات أبحاث الأورام والتجارب السريرية وموافقات FDA والأخبار وتنبؤات MAMMAL.",
    },
  },
  "indian-mandi-prices": {
    description: {
      ar: "أسعار سوق الجملة اليومية مجاناً وبدون مفتاح لـ 5 ولايات هندية من data.gov.in.",
    },
  },
  "ai-law-tracker": {
    description: {
      ar: "قوانين تنظيم الذكاء الاصطناعي حسب الدولة (أمريكا وأوروبا والعالم) بصيغة JSON للقراءة فقط مع طبقة مجانية.",
    },
  },
  "ipgeolocation": {
    description: {
      ar: "واجهة تحديد الموقع الجغرافي لـ IP مع خطة مجانية 30 ألف طلب شهرياً.",
    },
  },
  "ipgeo": {
    description: {
      ar: "واجهة تحديد IP مجانية وغير محدودة مع معلومات مفيدة.",
    },
  },
  "ip-vigilante": {
    description: {
      ar: "واجهة تحديد الموقع الجغرافي لعناوين IP مجانية.",
    },
  },
  "astroworld": {
    description: {
      ar: "بيانات ماين كرافت مجانية: مخلوقات وبيئات وعناصر وتعاويذ وبنى وأوامر وإصدارات وإنجازات وتبادلات.",
    },
  },
  "farmdash": {
    description: {
      ar: "ذكاء مالي لامركزي: تقييم مخاطر البروتوكولات ومحاكاة العوائد مع 84 أداة MCP وطبقة Scout مجانية.",
    },
  },
  "open-meteo": {
    description: {
      ar: "واجهة طقس مجانية للاستخدامات غير التجارية.",
    },
  },
  "justmemewtf": {
    description: {
      ar: "واجهة ميمات مجانية تضم 2400+ قالب مع البحث والشائع والتوليد بالذكاء الاصطناعي.",
    },
  },
  "smtpfast": {
    description: {
      ar: "إرسال البريد المعاملاتي وإدارة جهات الاتصال والنشرات، مجاناً حتى 3000 بريد شهرياً.",
    },
  },
  "improvmx": {
    description: {
      ar: "واجهة لخدمة إعادة توجيه البريد الإلكتروني المجانية.",
    },
  },
  "vector-express-v20": {
    description: {
      ar: "واجهة مجانية لتحويل الملفات المتجهة (Vector).",
    },
  },
  "printsocket": {
    description: {
      ar: "أرسل ملفات PDF وملصقات ZPL وإيصالات ESC/POS إلى طابعاتك من أي لغة برمجة؛ بطبقة مجانية.",
    },
  },
  "polydoc": {
    description: {
      ar: "تحويل HTML والروابط إلى PDF ولقطات شاشة، مع الفواتير الإلكترونية Factur-X/ZUGFeRD؛ طبقة مجانية.",
    },
  },
  "pdfmint": {
    description: {
      ar: "تحويل HTML أو Markdown أو رابط إلى PDF أو PNG مع نقطة تجربة بدون مفتاح وطبقة مجانية.",
    },
  },
  "ocrspace": {
    description: {
      ar: "استخراج النصوص من الصور وملفات PDF عبر OCR مع طبقة مجانية.",
    },
  },
  "ilovepdf": {
    description: {
      ar: "تحويل ودمج وتقسيم واستخراج نصوص وإضافة ترقيم صفحات لملفات PDF، مجاناً حتى 250 ملفاً شهرياً.",
    },
  },
  "free-dictionary": {
    description: {
      ar: "تعريفات ونطق وأنواع كلام وأمثلة ومرادفات من قاموس مجاني.",
    },
  },
  "tinymind-agent-tools": {
    description: {
      ar: "واجهات مجانية من وكيل ذكاء اصطناعي: البحث عن ممثل، كلمة اليوم، قصائد، نكات، وفحص الاتصال.",
    },
  },
  "talordata": {
    description: {
      ar: "بيانات نتائج محركات البحث (SERP) مع تجربة مجانية.",
    },
  },
  "statically": {
    description: {
      ar: "شبكة CDN مجانية للمطورين.",
    },
  },
  "shotanvil": {
    description: {
      ar: "واجهة لالتقاط الشاشات وتحويل HTML إلى PDF مع طبقة مجانية ومصادقة API key أو x402.",
    },
  },
  "savepageio": {
    description: {
      ar: "واجهة REST مجانية لالتقاط لقطات شاشة لمواقع سطح المكتب أو الجوال.",
    },
  },
  "proxyforge": {
    description: {
      ar: "قائمة مجانية محدّثة تلقائياً من البروكسيات المختبرة (HTTP/HTTPS/SOCKS4/SOCKS5) تُحدَّث كل 6 ساعات.",
    },
  },
  "peak": {
    description: {
      ar: "حل تحديات Cloudflare Turnstile وألغاز الخمس ثوانٍ، تدفع مقابل كل حل ناجح مع 1000 حل مجاني.",
    },
  },
  "jsonbinio": {
    description: {
      ar: "تخزين JSON مجاني مثالي للتطبيقات والمواقع والجوال الصغيرة.",
    },
  },
  "brewpage": {
    description: {
      ar: "استضافة مجانية لـ HTML وJSON وKey-Value وملفات ومواقع متعددة الصفحات مع روابط قصيرة واحتفاظ TTL.",
    },
  },
  "amazonscraperapi": {
    description: {
      ar: "كشط منتجات وبحث ودفعات أمازون عبر بروكسيات سكنية (1000 طلب مجاني).",
    },
  },
  "exchangeratedev": {
    description: {
      ar: "أسعار صرف حية وتاريخية، 168 زوجاً حتى عام 1999، متوافقة مع Frankfurter، مجاناً 10K شهرياً.",
    },
  },
  "exchangerate-api": {
    description: {
      ar: "تحويل عملات مجاني.",
    },
  },
  "economiaawesome": {
    description: {
      ar: "أسعار عملات برتغالية مجانية وتحويل بلا حدود معدل.",
    },
  },
  "currencyfreaks": {
    description: {
      ar: "أسعار صرف حالية وتاريخية مع خطة مجانية 1K طلب شهرياً.",
    },
  },
  "currencybeacon": {
    description: {
      ar: "أسعار صرف لحظية وتاريخية مع طبقة مجانية.",
    },
  },
  "currency-api": {
    description: {
      ar: "واجهة أسعار صرف مجانية تضم 150+ عملة بدون حدود معدل.",
    },
  },
  "amdoren": {
    description: {
      ar: "واجهة عملات مجانية تضم أكثر من 150 عملة.",
    },
  },
  "exchangeratehost": {
    description: {
      ar: "واجهة مجانية لأسعار الصرف الأجنبي والعملات الرقمية.",
    },
  },
  "hostdefi": {
    description: {
      ar: "درجات أمان مجانية A+ حتى F للرموز عبر سلاسل Solana وEVM.",
    },
  },
  "web3-storage": {
    description: {
      ar: "مشاركة وتخزين ملفات مجاني بمساحة 1 تيرابايت.",
    },
  },
  "pantry": {
    description: {
      ar: "تخزين JSON مجاني للمشاريع الصغيرة.",
    },
  },
  "tradedatahub": {
    description: {
      ar: "بيانات مقاولي الولايات المتحدة مع واجهة اكتشاف مجانية للتغطية والأسعار والمعاينات.",
    },
  },
  "freelancer": {
    description: {
      ar: "توظيف المطورين والمستقلين لإنجاز الأعمال.",
    },
  },
  "runyankole-bible": {
    description: {
      ar: "واجهة REST مجانية للكتاب المقدس بلغة Runyankore-Rukiga — 66 سفراً و31106 آية.",
    },
  },
  "twzrd-agent-intel": {
    description: {
      ar: "تقييم ثقة وكلاء الذكاء الاصطناعي على سلسلة Solana عبر MCP؛ 4 أدوات مجانية لتسجيل النقاط والتحقق من محافظ الوكلاء.",
    },
  },
  "quran-api": {
    description: {
      ar: "واجهة قرآن كريم مجانية بأكثر من 90 لغة و400 ترجمة.",
    },
  },
  "bible-api": {
    description: {
      ar: "واجهة برمجية مجانية للحصول على نصوص الكتاب المقدس بعدة لغات وترجمات مختلفة دون الحاجة لمفتاح API.",
      en: "Free API for Bible texts in multiple languages and translations, no API key required.",
    },
  },
  "the-dog-api": {
    description: {
      ar: "واجهة برمجية توفر بيانات وصوراً ومعلومات شاملة ومفصلة عن مختلف سلالات الكلاب.",
      en: "An API providing comprehensive data, images, and details about different dog breeds.",
    },
  },
};

/**
 * قاموس عبارات مشترك: القيم القصيرة المتكررة في بيانات الخطة المجانية
 * (مثل "مجاني بالكامل وبدون مفتاح") تأتي من الوكيل بالعربية فقط، وترجمتها هنا
 * تغطي كل الخدمات المكتشفة آلياً دون الحاجة لإدخال يدوي لكل خدمة.
 */
const PHRASE_I18N: Record<string, string> = {
  "مجاني بالكامل وبدون مفتاح": "Completely free, no key required",
  "مجاني بالكامل وبدون API key": "Completely free, no API key required",
  "مجاني 100%": "100% free",
  "خطة Free دائمة": "Permanent Free plan",
  "طبقة مجانية دائمة (10k طلبات/شهر)": "Permanent free tier (10K requests/month)",
  "طبقة مجانية دائمة بدون بطاقة": "Permanent free tier, no card",
  "مشروع مجاني دائم": "One free project, forever",
  "خطة Experiment مجانية": "Free Experiment plan",
  "Hobby Plan مجاني": "Free Hobby plan",
  "رصيد مجاني عند التسجيل (500 نقطة تقريباً)": "Free credits on signup (~500 points)",
  "$10 رصيد مجاني عند التسجيل": "$10 free credit on signup",
  "10 آلاف رصيد شهرياً": "10K credits/month",
  "1000 رصيد شهرياً": "1,000 credits/month",
  "2000 استعلام شهرياً": "2,000 queries/month",
  "100 استعلام مجاناً يومياً": "100 free queries/day",
  "100 بحث مجاناً شهرياً": "100 free searches/month",
  "50 بحث مجاناً شهرياً": "50 free searches/month",
  "100 بحث مجاني": "100 free searches",
  "2500 بحث مجاني": "2,500 free searches",
  // قيم رصيد مخزّنة بالعربية في خدمات مفردة (واجهات الكتاب المقدس ومنصة مستقل)
  "الخدمة مجانية ومفتوحة بالكامل للاستخدام المباشر دون الحاجة لتسجيل أو مفتاح API":
    "Fully free and open for direct use—no signup or API key required",
  "الوصول لحساب المطورين واستخدام الواجهة مجاني للاستخدام العادي":
    "Developer account access and normal API usage are free",
  "الخدمة مجانية تماماً ومفتوحة للاستخدام العام بدون مفتاح API أو تسجيل.":
    "Completely free and open for public use, no API key or signup required.",
};

/** هل النص يحتوي حروفاً عربية؟ */
const ARABIC_RE = /[\u0600-\u06FF]/;

/**
 * ترجمة ملاحظات الاكتشاف الآلي التي يكتبها الوكيل بالعربية
 * (مثال: "مصدر الاكتشاف: public-apis (GitHub)") — نمط ثابت يغطي كل خدمة جديدة.
 */
function localizeAutoNote(text: string, lang: Language): string {
  if (lang !== "en") return text;
  const match = /^مصدر الاكتشاف:\s*(.+)$/.exec(text.trim());
  if (match) return `Source: ${match[1]}`;
  return text;
}

/**
 * إرجاع نص الخدمة (وصف/رصيد/حد استخدام/ملاحظات) باللغة المطلوبة.
 *
 * الترتيب: قاموس الخدمة (slug) ← قاموس العبارات المتكررة ← ترجمة ملاحظات الاكتشاف
 * ← احتياط القيمة المخزنة مع منع ظهور نص بلغة مخالفة للغة الصفحة.
 */
export function serviceText(
  slug: string,
  field: ServiceField,
  lang: Language,
  fallback: string | null | undefined
): string {
  if (!fallback) return "";

  const copy = SERVICE_I18N[slug]?.[field];
  const value = copy ? copy[lang] : undefined;
  if (value) return value;

  const phrase = PHRASE_I18N[fallback.trim()];
  if (phrase && lang === "en") return phrase;

  if (field === "notes") return localizeAutoNote(fallback, lang);

  const isArabic = ARABIC_RE.test(fallback);
  const mismatch = (lang === "ar" && !isArabic) || (lang === "en" && isArabic);
  if (!mismatch) return fallback;

  // لغة النص المخزّن تخالف لغة الصفحة ولا ترجمة متوفرة بعد:
  // نُظهر تنبيهاً للوصف فقط، ونتجاهل بقية الحقول بدل عرض نص بلغة مخالفة.
  if (field === "description") {
    return lang === "ar"
      ? "الوصف متوفر بالإنجليزية حالياً، وستُضاف الترجمة العربية قريباً."
      : "Description is currently available in Arabic only.";
  }
  return "";
}

/** وصف الخدمة باللغة الحالية مع احتياط للقيمة المخزنة. */
export function localizedDescription(s: ServiceRecord, lang: Language): string {
  return serviceText(s.slug, "description", lang, s.description);
}
