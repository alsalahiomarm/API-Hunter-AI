import type { Category, ServiceRecord } from "@apihunter/db";

/**
 * فهم اللغة الطبيعية (NLU) للبوت:
 * يحوّل طلب المستخدم الحر إلى تصنيف أو كلمات بحث، ثم يجد أفضل النتائج.
 */

export interface NluResult {
  intent: "category" | "search" | "greeting";
  category?: Category;
  query: string;
  matchedKeywords: string[];
}

// تحيات شائعة (عربي/إنجليزي) لمعالجتها بشكل مناسب بدل عرض خدمات عشوائية
const GREETINGS = [
  "مرحبا",
  "مرحباً",
  "هلا",
  "اهلا",
  "أهلا",
  "السلام عليكم",
  "سلام عليكم",
  "صباح الخير",
  "مساء الخير",
  "hi",
  "hello",
  "hey",
  "start",
];

/** هل النص مجرد تحية؟ */
export function isGreeting(raw: string): boolean {
  const n = normalize(raw).replace(/[^\p{L}\s]/gu, "").trim();
  if (!n) return false;
  return GREETINGS.some((g) => {
    const gn = normalize(g);
    return n === gn || n === `${gn} عليكم` || n.startsWith(`${gn} `) && n.length <= gn.length + 12;
  });
}

// تطبيع العربية: إزالة التشكيل وتوحيد أشكال الألف والتاء المربوطة
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // تشكيل
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[؟!.,،]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface CategorySignal {
  category: Category;
  words: string[];
}

const CATEGORY_SIGNALS: CategorySignal[] = [
  {
    category: "AI_MODELS",
    words: [
      "llm", "ai model", "language model", "gpt", "gemini", "claude", "llama",
      "mistral", "chatbot", "نماذج", "نموذج", "ذكاء اصطناعي", "ذكاء", "تشات",
      "شات جي بي تي", "شات", "مفتاح ملنموذج", "مولد نصوص",
      "ترجمه", "translate", "مساعد ذكي", "روبوت محادثه", "gpt-4",
      "نموذج لغوي", "تحليل نصوص",
    ],
  },
  {
    category: "SEARCH_TOOLS",
    words: [
      "search", "internet search", "web search", "serp", "scraping", "بحث",
      "البحث", "بحث في الويب", "بحث في الإنترنت", "بحث في الانترنت", "محرك بحث",
      "كشط", "سكراب", "نتائج البحث", "بحث ويب", "بيانات الويب", "زواحف", "crawl",
      "معلومات من الانترنت", "جوجل",
    ],
  },
  {
    category: "AUDIO_IMAGE",
    words: [
      "tts", "text to speech", "voice", "speech", "audio", "image generation",
      "generate image", "transcription", "صوت", "صوتي", "كلام", "نطق", "تسجيل",
      "توليد صور", "صور", "صوره", "توليد الصور", "فيديو", "مفكرات صوتية",
      "رسم", "توليد فيديو", "تحويل النص الى كلام", "تفريغ صوتي", "صور بالذكاء",
      "تصميم", "image", "video",
    ],
  },
  {
    category: "DATABASES",
    words: [
      "database", "postgres", "redis", "sql", "storage", "قاعدة بيانات", "قواعد",
      "قاعده", "تخزين", "رديس", "بستجرس", "سوبابيس", "supabase", "فايربيز",
      "firebase", "نيون", "neon", "mongodb", "ملفات", "تخزين ملفات", "kv",
    ],
  },
  {
    category: "DEV_TOOLS",
    words: [
      "dev tool", "developer", "hosting", "deploy", "serverless", "auth",
      "send email", "sms api", "اخر الاخبار", "ادوات تطوير", "استضافه",
      "ارسال رسائل", "بريد", "استضافة", "مجال", "نشر", "دومين", "domain",
      "ايميل", "email", "مصادقه", "توثيق دخول", "خطوط", "cdn", "مراقبه",
      "لوغاريتمات", "logs", "ارسال sms", "واتساب",
    ],
  },
];

// كلمات بحث عامة تتجاهلها الفلاتر
const IGNORED = new Set([
  "ا","فى","في","من","الي","على","اعطيني","اعطني","اريد","احتاج","ابحث",
  "افضل","مفتاح","مفاتيح","api","مجاني","مجانا","بالعربي","وش","من فضلك",
  "كيف","شلون",
]);

export function classifyQuery(raw: string): NluResult {
  const words = normalize(raw);

  // 1) تحية فقط -> رد ترحيبي بلوحة التصنيفات
  if (isGreeting(raw)) {
    return { intent: "greeting", query: "", matchedKeywords: [] };
  }

  let best: { category: Category; score: number } | null = null;
  const matchedKeywords: string[] = [];

  for (const signal of CATEGORY_SIGNALS) {
    let score = 0;
    for (const word of signal.words) {
      const w = normalize(word);
      if (containsPhrase(words, w)) {
        score++;
        matchedKeywords.push(word);
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { category: signal.category, score };
    }
  }

  const category = best?.category;

  // استخراج كلمات البحث المهمة (نُبقي الكلمات النصية ونستبعد الأرقام وكلمات الحشو)
  const queryWords = words
    .split(" ")
    .filter((w) => w.length >= 2 && isNaN(Number(w)) && !IGNORED.has(w));
  const query = queryWords.slice(0, 4).join(" ");

  if (category && (matchedKeywords.length > 1 || !query)) {
    return { intent: "category", category, query, matchedKeywords };
  }
  return { intent: "search", category, query, matchedKeywords };
}

/** مطابقة كلمة/عبارة داخل النص بحدود كلمات (تمنع مطابقة "ai" داخل كلمة أخرى) */
function containsPhrase(text: string, phrase: string): boolean {
  if (!phrase) return false;
  const safe = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${safe}(?=[^\\p{L}\\p{N}]|$)`, "u").test(text);
}

/** ترتيب مطابقة الخدمات مع طلب المستخدم */
export function rankServices(
  services: ServiceRecord[],
  nlu: NluResult
): ServiceRecord[] {
  const q = normalize(nlu.query);

  const scored = services.map((s) => {
    // 1) مطابقة نصية (الاسم + الشركة) أقوى من الوصف
    let textScore = 0;
    const name = normalize(`${s.name} ${s.provider}`);
    const haystack = normalize(`${s.name} ${s.provider} ${s.description} ${s.category}`);

    if (nlu.query && q) {
      if (name.includes(q) || q.includes(name)) textScore += 5;
      else if (haystack.includes(q)) textScore += 2;
      else {
        for (const part of q.split(" ")) {
          if (part.length < 2) continue;
          if (name.includes(part)) textScore += 2;
          else if (haystack.includes(part)) textScore += 1;
        }
      }
    }

    // 2) مطابقة التصنيف (وزن عالٍ كي تتقدم خدمات نفس المجال المطلوب)
    const catScore = nlu.category && s.category === nlu.category ? 3 : 0;

    // 3) ترجيح بسيط للحالة (لا يكفي وحده لاعتبار الخدمة مطابقة)
    let bonus = 0;
    if (s.status === "FREE_TIER") bonus += 0.6;
    if (s.status === "VERIFIED") bonus += 0.4;

    return { s, relevance: textScore + catScore, total: textScore + catScore + bonus };
  });

  return scored
    .filter((x) => x.relevance > 0) // لا نتائج وهمية: لا بد من تطابق فعلي
    .map((x) => ({ ...x, tiebreak: Math.random() })) // تنويع: لا تتكرر نفس الإجابة حرفياً
    .sort((a, b) => b.total - a.total || a.tiebreak - b.tiebreak)
    .slice(0, 3)
    .map((x) => x.s);
}