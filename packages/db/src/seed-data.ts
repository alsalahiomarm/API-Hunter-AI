import type { ServiceRecord, FreeTierDetails } from "./types";

/**
 * بيانات تجريبية (Seed) لخدمات API مجانية حقيقية معروفة.
 * ملاحظة: تفاصيل الخطط المجانية تتغير باستمرار - الوكيل يقوم بتحديثها تلقائياً.
 * هذه البيانات تُستخدم للعرض والتجربة، وكتخزين بديل عند غياب قاعدة البيانات.
 */

function svc(
  name: string,
  slug: string,
  provider: string,
  category: ServiceRecord["category"],
  description: string,
  freeTier: FreeTierDetails,
  activationLink: string,
  documentationLink: string,
  codeExample: string,
  status: ServiceRecord["status"],
  sourceUrl?: string
): ServiceRecord {
  return {
    id: `seed-${slug}`,
    name,
    slug,
    provider,
    category,
    description,
    freeTier,
    activationLink,
    documentationLink,
    codeExample,
    status,
    verifiedAt: new Date().toISOString(),
    sourceUrl: sourceUrl ?? null,
    createdAt: new Date().toISOString(),
  };
}

const pymod = (codeBody: string) => codeBody;

export const seedServices: ServiceRecord[] = [
  // ===================================================================
  // 1) نماذج الذكاء الاصطناعي
  // ===================================================================
  svc(
    "Google Gemini API",
    "google-gemini",
    "Google AI Studio",
    "AI_MODELS",
    "واجهة نماذج Gemini العائلية (Flash / Pro) مع طبقة مجانية سخية تدعم الصور والنصوص والصوت.",
    {
      dailyRequests: 100,
      rateLimit: "15 RPM مجاناً",
      models: ["gemini-1.5-flash", "gemini-2.0-flash"],
      freeCredits: "طبقة مجانية دائمة بدون بطاقة",
      requiresCard: false,
      notes: "أنشئ مفتاحاً من Google AI Studio ثم مرّره في الكود.",
    },
    "https://aistudio.google.com/apikey",
    "https://ai.google.dev/gemini-api/docs",
    pymod(
      'import google.generativeai as genai\n' +
      'genai.configure(api_key="YOUR_GEMINI_KEY")\n' +
      'model = genai.GenerativeModel("gemini-1.5-flash")\n' +
      'print(model.generate_content("مرحبا").text)'
    ),
    "FREE_TIER",
    "https://ai.google.dev"
  ),
  svc(
    "Groq Cloud API",
    "groq-cloud",
    "Groq",
    "AI_MODELS",
    "تشغيل نماذج مفتوحة (Llama 3.3, Mixtral) بسرعة فائقة عبر رقاقات LPU مع طبقة مجانية سخية.",
    {
      dailyRequests: 1440,
      rateLimit: "30 req/min",
      models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
      freeCredits: "طبقة مجانية دائمة بدون بطاقة",
      requiresCard: false,
      notes: "مثالية للنماذج الأولية والـ chatbots بلا أي تكلفة.",
    },
    "https://console.groq.com/keys",
    "https://console.groq.com/docs",
    pymod(
      'from openai import OpenAI\n' +
      'client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key="YOUR_GROQ_KEY")\n' +
      'r = client.chat.completions.create(model="llama-3.3-70b-versatile", messages=[{"role":"user","content":"مرحبا"} ])\n' +
      'print(r.choices[0].message.content)'
    ),
    "FREE_TIER",
    "https://groq.com"
  ),
  svc(
    "Mistral AI La Plateforme",
    "mistral-la-plateforme",
    "Mistral AI",
    "AI_MODELS",
    "نماذج Mistral 7B / 8x7B مع خطة تجريب مجانية للتطوير والتجريب.",
    {
      rateLimit: "1 req/s",
      models: ["open-mistral-7b", "mistral-small-latest"],
      freeCredits: "خطة Experiment مجانية",
      requiresCard: false,
      notes: "بعد استهلاك الحصة تتحول تلقائياً إلى خطة مدفوعة - راقب الاستهلاك.",
    },
    "https://console.mistral.ai/api-keys",
    "https://docs.mistral.ai",
    pymod(
      'from mistralai import Mistral\n' +
      'client = Mistral(api_key="YOUR_MISTRAL_KEY")\n' +
      'resp = client.chat.complete(model="mistral-small-latest", messages=[{"role":"user","content":"مرحبا"} ])\n' +
      'print(resp.choices[0].message.content)'
    ),
    "FREE_CREDIT",
    "https://mistral.ai"
  ),
  // ===================================================================
  // 2) أدوات البحث في الإنترنت
  // ===================================================================
  svc(
    "Tavily Search API",
    "tavily-search",
    "Tavily",
    "SEARCH_TOOLS",
    "بحث محسّن للذكاء الاصطناعي مع نتائج منظمة (تشرح الروابط وتلخصها) - مثالية للـ RAG والوكلاء.",
    {
      monthlyRequests: 1000,
      rateLimit: "1000 رصيد/شهر",
      models: ["search", "extract"],
      freeCredits: "1000 رصيد شهرياً",
      requiresCard: false,
      notes: "الرصيد يتجدد شهرياً بدون بطاقة ائتمان.",
    },
    "https://app.tavily.com",
    "https://docs.tavily.com",
    pymod(
      'from tavily import TavilyClient\n' +
      'client = TavilyClient(api_key="YOUR_TAVILY_KEY")\n' +
      'r = client.search("أفضل أدوات البحث المجانية")\n' +
      'print(r.get("results", [])[0])'
    ),
    "FREE_TIER",
    "https://tavily.com"
  ),
  svc(
    "Serper.dev Search API",
    "serper-search",
    "Serper.dev",
    "SEARCH_TOOLS",
    "واجهة Google Search API السريعة (نتائج ويب، أخبار، صور) مصممة للذكاء الاصطناعي.",
    {
      monthlyRequests: 2500,
      rateLimit: "2500 بحث مجاني",
      models: ["google-web", "google-news"],
      freeCredits: "2500 بحث مجاني",
      requiresCard: false,
      notes: "تحتاج التسجيل بالبريد فقط للحصول على المفتاح.",
    },
    "https://serper.dev",
    "https://serper.dev/playground",
    pymod(
      'import requests\n' +
      'r = requests.post("https://google.serper.dev/search", headers={"X-API-KEY": "YOUR_SERPER_KEY"}, json={"q": "free LLM api"})\n' +
      'print(r.json()["organic"][0]["title"])'
    ),
    "FREE_TIER",
    "https://serper.dev"
  ),
  svc(
    "Exa Search API",
    "exa-search",
    "Exa (Metaphor)",
    "SEARCH_TOOLS",
    "بحث معنوي (Semantic & Neural) في الويب، متخصص للوكلاء والبحث العلمي.",
    {
      monthlyRequests: null,
      rateLimit: "محدود",
      models: ["neural-search", "similar"],
      freeCredits: "$10 رصيد مجاني عند التسجيل",
      requiresCard: false,
      notes: "رصيد ترحيبي يُمنح بعد تفعيل الحساب (قد يتطلب توثيق).",
    },
    "https://dashboard.exa.ai",
    "https://docs.exa.ai",
    pymod(
      'import exa_py\n' +
      'client = exa_py.Exa("YOUR_EXA_KEY")\n' +
      'results = client.search("recent AI news", use_autoprompt=True, num_results=3)\n' +
      'print([r.title for r in results.results])'
    ),
    "FREE_CREDIT",
    "https://exa.ai"
  ),
  svc(
    "Brave Search API",
    "brave-search",
    "Brave",
    "SEARCH_TOOLS",
    "بحث مستقل يحترم الخصوصية من محرك Brave، مع طبقة مجانية كبيرة ونتائج نظيفة دون إعلانات.",
    {
      monthlyRequests: 2000,
      rateLimit: "2000 استعلام/شهر",
      models: ["web-search", "image-search"],
      freeCredits: "2000 استعلام شهرياً",
      requiresCard: false,
      notes: "اضبط خطة Free ثم أنشئ مفتاحاً من Developer Dashboard.",
    },
    "https://api.search.brave.com/app/keys",
    "https://api-dashboard.search.brave.com",
    pymod(
      'import requests\n' +
      'headers = {"X-Subscription-Token": "YOUR_BRAVE_KEY"}\n' +
      'r = requests.get("https://api.search.brave.com/res/v1/web/search", params={"q": "free api"}, headers=headers)\n' +
      'print(r.json()["web"]["results"][0]["title"])'
    ),
    "FREE_TIER",
    "https://brave.com/search/api/"
  ),
  svc(
    "SerpApi Google Search",
    "serpapi",
    "SerpApi",
    "SEARCH_TOOLS",
    "كشط نتائج Google وBing وYouTube (نتائج، خرائط، منتجات) عبر واجهة رسمية واحدة.",
    {
      monthlyRequests: 100,
      rateLimit: "100 بحث مجاني",
      models: ["google", "youtube", "shopping"],
      freeCredits: "100 بحث مجاني",
      requiresCard: false,
      notes: "الطبقة المجانية محدودة؛ مثالية لاختبار الواجهة.",
    },
    "https://serpapi.com/users/sign_up",
    "https://serpapi.com/search-api",
    pymod(
      'from serpapi import GoogleSearch\n' +
      'params = {"q": "coffee", "api_key": "YOUR_SERPAPI_KEY"}\n' +
      'results = GoogleSearch(params).get_dict()\n' +
      'print(results["organic_results"][0]["title"])'
    ),
    "FREE_CREDIT",
    "https://serpapi.com"
  ),
  // ===================================================================
  // 3) الصوت والصورة والنصوص
  // ===================================================================
  svc(
    "ElevenLabs API",
    "elevenlabs",
    "ElevenLabs",
    "AUDIO_IMAGE",
    "توليد أصوات بشرية فائقة الواقعية + تحويل النص للكلام (TTS) وصوت إلى نص (STT).",
    {
      monthlyRequests: null,
      rateLimit: "10k رصيد/شهر",
      models: ["eleven_multilingual_v2", "eleven_turbo_v2"],
      freeCredits: "10 آلاف رصيد شهرياً",
      requiresCard: false,
      notes: "الرصيد يكفي ~10 دقائق توليد صوت شهرياً.",
    },
    "https://elevenlabs.io/app/sign-in",
    "https://elevenlabs.io/docs/api-reference",
    pymod(
      'import requests\n' +
      'headers = {"xi-api-key": "YOUR_ELEVENLABS_KEY", "Content-Type": "application/json"}\n' +
      'payload = {"text": "مرحبا بكم في قناة صياد المفاتيح", "voice": "EXAVITQu4vr4xnSDxMaL"}\n' +
      'r = requests.post("https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL", json=payload, headers=headers)\n' +
      'open("hello.mp3", "wb").write(r.content)'
    ),
    "FREE_CREDIT",
    "https://elevenlabs.io"
  ),
  // ===================================================================
  // 4) قواعد البيانات والتخزين
  // ===================================================================
  svc(
    "Supabase Database & Auth",
    "supabase",
    "Supabase",
    "DATABASES",
    "بديل مفتوح لـ Firebase: قاعدة PostgreSQL كاملة + مصادقة + تخزين ملفات + Realtime مجاناً.",
    {
      dailyRequests: null,
      monthlyRequests: null,
      rateLimit: "500MB قاعدة + مصادقة 50K مستخدم",
      models: ["postgres", "auth", "storage", "edge-functions"],
      freeCredits: "مشروع مجاني دائم",
      requiresCard: false,
      notes: "المشاريع المجانية تتجمد بعد أسبوع خمول - يمكن إيقاظها يدوياً.",
    },
    "https://supabase.com/dashboard",
    "https://supabase.com/docs",
    pymod(
      'from supabase import create_client\n' +
      'client = create_client("https://xyz.supabase.co", "YOUR_SUPABASE_KEY")\n' +
      'res = client.table("tasks").select("*").limit(5).execute()\n' +
      'print(res.data)'
    ),
    "FREE_TIER",
    "https://supabase.com"
  ),
  svc(
    "Neon Serverless Postgres",
    "neon-postgres",
    "Neon",
    "DATABASES",
    "قاعدة PostgreSQL سحابية بدون خادم مع فرع بيانات (Branching) وأدوات تنبؤ ذكي للتوسع.",
    {
      monthlyRequests: null,
      rateLimit: "0.5GB تخزين + 190 ساعة حساب",
      models: ["postgres-16", "serverless"],
      freeCredits: "خطة Free دائمة",
      requiresCard: false,
      notes: "مناسب للمشاريع الشخصية والتطوير مع تشغيل/إيقاف تلقائي.",
    },
    "https://neon.tech",
    "https://neon.tech/docs",
    pymod(
      'import psycopg2\n' +
      'conn = psycopg2.connect("postgresql://user:pass@ep-xxx.aws.neon.tech/dbname")\n' +
      'cur = conn.cursor()\n' +
      'cur.execute("SELECT version()")\n' +
      'print(cur.fetchone())'
    ),
    "FREE_TIER",
    "https://neon.tech"
  ),
  svc(
    "Upstash Redis / QStash",
    "upstash",
    "Upstash",
    "DATABASES",
    "Redis السحابي وQStash (طوابير رسائل من serverless) بطبقات مجانية سخية للمطورين.",
    {
      dailyRequests: 10000,
      rateLimit: "10K أمر/يوم",
      models: ["redis", "qstash", "ratelimit"],
      freeCredits: "خطة Free دائمة",
      requiresCard: false,
      notes: "حد أقصى تخزين 256MB في الطبقة المجانية.",
    },
    "https://upstash.com",
    "https://upstash.com/docs",
    pymod(
      'import redis\n' +
      'r = redis.Redis.from_url("rediss://default:YOUR_TOKEN@xx.upstash.io:6379")\n' +
      'r.set("hello", "world")\n' +
      'print(r.get("hello"))'
    ),
    "FREE_TIER",
    "https://upstash.com"
  ),
  // ===================================================================
  // 5) أدوات التطوير والبنية
  // ===================================================================
  svc(
    "Telegram Bot API",
    "telegram-bot-api",
    "Telegram",
    "DEV_TOOLS",
    "واجهة رسائل تليجرام الرسمية: مجانية بالكامل وغير محدودة للبوتات - أساس أي تكامل أوتوماتيكي.",
    {
      dailyRequests: null,
      monthlyRequests: null,
      rateLimit: "30 req/sec تقريباً",
      models: ["sendMessage", "inlineKeyboard", "webhook"],
      freeCredits: "مجاني 100%",
      requiresCard: false,
      notes: "كوّن بوتك من @BotFather ولا تحتاج أي بطاقة.",
    },
    "https://t.me/BotFather",
    "https://core.telegram.org/bots/api",
    pymod(
      'import requests\n' +
      'TOKEN = "YOUR_BOT_TOKEN"\n' +
      'url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"\n' +
      'requests.post(url, json={"chat_id": "@channel", "text": "مرحبا"}).json()'
    ),
    "FREE_TIER",
    "https://core.telegram.org/bots/api"
  ),
  svc(
    "Vercel AI SDK + Edge",
    "vercel-ai",
    "Vercel",
    "DEV_TOOLS",
    "سكّ المطورين الرسمي لبناء تطبيقات LLM موحدة عبر مزودين كثيرين، مع استضافة Edge مجانية.",
    {
      dailyRequests: null,
      monthlyRequests: null,
      rateLimit: "100GB عرض يومياً",
      models: ["ai-sdk", "edge", "observability"],
      freeCredits: "Hobby Plan مجاني",
      requiresCard: false,
      notes: "خطة Hobby تسمح بنشر مشاريع لامحدودة بدون بطاقة.",
    },
    "https://vercel.com/signup",
    "https://sdk.vercel.ai",
    pymod(
      'import { generateText } from "ai";\n' +
      'import { openai } from "@ai-sdk/openai";\n' +
      'const { text } = await generateText({ model: openai("gpt-4o-mini"), prompt: "مرحبا" });\n' +
      'console.log(text);'
    ),
    "FREE_CREDIT",
    "https://vercel.com"
  ),
];