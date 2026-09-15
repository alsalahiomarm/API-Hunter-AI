import type { Category, ServiceRecord } from "@apihunter/db";

/**
 * فهم اللغة الطبيعية (NLU) للبوت:
 * يحوّل طلب المستخدم الحر إلى تصنيف أو كلمات بحث، ثم يجد أفضل النتائج.
 */

export interface NluResult {
  intent: "category" | "search";
  category?: Category;
  query: string;
  matchedKeywords: string[];
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
    ],
  },
  {
    category: "SEARCH_TOOLS",
    words: [
      "search", "internet search", "web search", "serp", "scraping", "بحث",
      "البحث", "بحث في الويب", "بحث في الإنترنت", "بحث في الانترنت", "محرك بحث",
      "كشط", "سكراب",
    ],
  },
  {
    category: "AUDIO_IMAGE",
    words: [
      "tts", "text to speech", "voice", "speech", "audio", "image generation",
      "generate image", "transcription", "صوت", "صوتي", "كلام", "نطق", "تسجيل",
      "توليد صور", "صور", "صوره", "توليد الصور", "فيديو", "مفكرات صوتية",
    ],
  },
  {
    category: "DATABASES",
    words: [
      "database", "postgres", "redis", "sql", "storage", "قاعدة بيانات", "قواعد",
      "قاعده", "تخزين", "رديس", "بستجرس",
    ],
  },
  {
    category: "DEV_TOOLS",
    words: [
      "dev tool", "developer", "hosting", "deploy", "serverless", "auth",
      "send email", "sms api", "اخر الاخبار", "ادوات تطوير", "استضافه",
      "ارسال رسائل", "بريد", "استضافة", "مجال",
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
  let best: { category: Category; score: number } | null = null;
  const matchedKeywords: string[] = [];

  for (const signal of CATEGORY_SIGNALS) {
    let score = 0;
    for (const word of signal.words) {
      const w = normalize(word);
      if (words.includes(w) || raw.toLowerCase().includes(word)) {
        score++;
        matchedKeywords.push(word);
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { category: signal.category, score };
    }
  }

  const category = best?.category;

  // استخراج كلمات البحث المهمة
  const queryWords = words
    .split(" ")
    .filter((w) => w.length >= 2 && !IGNORED.has(w) && !isNaN(Number(w)));
  const query = queryWords.slice(0, 4).join(" ");

  if (category && (matchedKeywords.length > 1 || !query)) {
    return { intent: "category", category, query, matchedKeywords };
  }
  return { intent: "search", category, query, matchedKeywords };
}

/** ترتيب مطابقة الخدمات مع طلب المستخدم */
export function rankServices(
  services: ServiceRecord[],
  nlu: NluResult
): ServiceRecord[] {
  const q = normalize(nlu.query);

  const scored = services.map((s) => {
    let score = 0;
    const name = normalize(`${s.name} ${s.provider}`);

    if (nlu.query && q) {
      if (name.includes(q) || q.includes(name)) score += 5;
      else {
        for (const part of q.split(" ")) {
          if (name.includes(part)) score += 2;
        }
      }
    }
    if (nlu.category && s.category === nlu.category) score += 1.5;
    if (s.status === "FREE_TIER") score += 0.6;
    if (s.status === "VERIFIED") score += 0.4;

    return { s, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.s);
}