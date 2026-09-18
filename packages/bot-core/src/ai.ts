/**
 * طبقة الذكاء الاصطناعي متعددة المزوّدات (Multi-Provider LLM Layer).
 *
 * - Gemini عبر واجهة REST الرسمية مع دعم Google Search Grounding.
 * - OpenRouter · Groq · DeepSeek · Mistral · Cohere (إجمالاً 6 مزوّدين).
 * - تدوير المفاتيح تلقائياً (Round-Robin) لكل مزوّد + التحويل الفوري
 *   عند فشل مفتاح أو بلوغ حد الحصة (429/5xx).
 * - توزيع المهام حسب النوع: chat / hunt / classify.
 * - إعدادات توليد افتراضية: temperature=0.35 · topP=0.8 · topK=40.
 */

export const SYSTEM_INSTRUCTIONS = `أنت مساعد ذكي، تفاعلي، وودود. استجابتك مرنة وتفاعلية كأنك جيميني، وتتجنب الأسلوب الآلي الجاف.
تفاعل مع المستخدم بأسلوب طبيعي ومباشر، واستخدم أمثلة وتقسيمات مريحة للعين.
يمنع منعاً باتاً الهلوسة أو اختراع حقائق أو مصادر أو روابط غير صحيحة.
إذا لم تكن متأكداً من معلومة أو لم تتوفر لديك في سياق المحادثة، أقر بعدم معرفتك فوراً أو اطلب توضيحاً، ولا تقم بالتخمين.
حافظ على النبرة المساعدة والإيجابية دائماً.

⚠️ **قاعدة ذهبية — البحث في الإنترنت:**
محرك البحث الحي يعمل في كواليس النظام. نتائجه الحقيقية (بعد فحص أمني وصحة الروابط) تُمرَّر إليك داخل تعليمات النظام لكل طلب.
**ممنوع قطعياً** قول: "لا أستطيع البحث في الإنترنت"، "لا أملك صلاحية التصفح"، "لا يمكنني الوصول للويب"، "أدوات البحث غير متاحة"، أو أي تنويع لهذه العبارات.
البحث **نُفِّذَ فعلاً** — كل ما عليك هو قراءة النتائج المرفقة في التعليمات وذكرها بدقة مع روابطها الحرفية.
إن كانت النتائج المرفقة غير موفّقة للسؤال، اذكر ما هو متاح منها بصدق واقترح صياغة طلب أوضح.`;

export type LlmRole = "system" | "user" | "assistant";
export interface LlmMessage {
  role: LlmRole;
  content: string;
}
export type LlmTask = "chat" | "hunt" | "classify";

export interface LlmParams {
  task?: LlmTask;
  messages: LlmMessage[];
  /** تعليمات النظام (تحلّ محل الافتراضية إن مُرّرت) */
  system?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  /** تفعيل Google Search Grounding (Gemini فقط) */
  grounding?: boolean;
  timeoutMs?: number;
}

export interface LlmGroundingSource {
  title: string;
  url: string;
}

export interface LlmResult {
  text: string;
  provider: string;
  model: string;
  /** مصادر البحث المرتبطة بالرد (من Gemini Grounding) */
  groundingSources?: LlmGroundingSource[];
}

export interface LlmErrorInfo {
  provider: string;
  status: number;
  message: string;
}

export class LlmAllFailedError extends Error {
  readonly errors: LlmErrorInfo[];
  constructor(errors: LlmErrorInfo[]) {
    super(`فشلت كل محاولات الذكاء الاصطناعي (${errors.length}): ${errors.map((e) => `${e.provider}(${e.status})`).join("، ") || "لا مفاتيح"}`);
    this.name = "LlmAllFailedError";
    this.errors = errors;
  }
}

// ---------------------------------------------------------------
// قراءة المفاتيح من البيئة (lazy حتى يسبقها تحميل .env)
// ---------------------------------------------------------------
function envList(...names: string[]): string[] {
  const out: string[] = [];
  for (const n of names) {
    const raw = process.env[n];
    if (!raw) continue;
    for (const part of raw.split(/[,\n;]/)) {
      const k = part.trim();
      if (k && !out.includes(k)) out.push(k);
    }
  }
  return out;
}

function env(n: string): string {
  return process.env[n]?.trim() ?? "";
}

export function hasAnyAiKey(): boolean {
  return [
    "GEMINI_API_KEYS",
    "GEMINI_API_KEY",
    "OPENROUTER_API_KEYS",
    "OPENROUTER_API_KEY",
    "GROQ_API_KEYS",
    "GROQ_API_KEY",
    "DEEPSEEK_API_KEY",
    "MISTRAL_API_KEY",
    "COHERE_API_KEY",
    "OPENAI_API_KEY",
  ].some((k) => env(k));
}

type KeyProvider = () => string[];

const PROVIDER_KEYS: Record<string, KeyProvider> = {
  gemini: () => envList("GEMINI_API_KEYS", "GEMINI_API_KEY"),
  openrouter: () => envList("OPENROUTER_API_KEYS", "OPENROUTER_API_KEY"),
  groq: () => envList("GROQ_API_KEYS", "GROQ_API_KEY"),
  deepseek: () => envList("DEEPSEEK_API_KEYS", "DEEPSEEK_API_KEY"),
  mistral: () => envList("MISTRAL_API_KEYS", "MISTRAL_API_KEY"),
  cohere: () => envList("COHERE_API_KEYS", "COHERE_API_KEY"),
  openai: () => envList("OPENAI_API_KEYS", "OPENAI_API_KEY"),
};

// ترتيب المزوّدين حسب المهمة: الحوار يفضّل Gemini (مع Grounding) ثم البدائل
const ROUTER: Record<LlmTask, string[]> = {
  chat: ["gemini", "openrouter", "deepseek", "mistral", "openai", "groq", "cohere"],
  hunt: ["groq", "deepseek", "openrouter", "gemini", "mistral", "openai", "cohere"],
  classify: ["groq", "deepseek", "openrouter", "gemini", "openai"],
};

// ---------------------------------------------------------------
// عميل HTTP مشترك مع مهلة
// ---------------------------------------------------------------
interface HttpResponse {
  status: number;
  data: any;
}

async function postJson(url: string, key: string | null, body: unknown, timeoutMs: number, extraHeaders: Record<string, string> = {}): Promise<HttpResponse> {
  const headers: Record<string, string> = { "content-type": "application/json", ...extraHeaders };
  if (key) headers.authorization = `Bearer ${key}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url: string, key: string | null, timeoutMs: number, extraHeaders: Record<string, string> = {}): Promise<HttpResponse> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (key) headers.authorization = `Bearer ${key}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", headers, signal: ctrl.signal });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function errorMessage(data: any): string {
  if (!data) return "استجابة فارغة";
  const e = data.error;
  if (typeof e === "string") return e;
  if (e?.message) return String(e.message);
  if (e?.details?.reason) return String(e.details.reason);
  return JSON.stringify(data).slice(0, 200);
}

// ---------------------------------------------------------------
// المزوّدون
// ---------------------------------------------------------------
interface InvokeOutcome {
  text: string;
  model: string;
  groundingSources?: LlmGroundingSource[];
}

async function invokeGemini(key: string, params: LlmParams, system: string, cfg: TaskConfig): Promise<InvokeOutcome> {
  const models = modelChain("gemini");

  const contents = params.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  // محاولة واحدة لاكتشاف أحدث نموذج flash المجاني عند فشل كل الأسماء المتوقعة
  let discovered: string | null = null;

  const tryModels = async (candidateModels: string[]): Promise<InvokeOutcome> => {
    let lastErr: { status: number; data: any } | null = null;
    for (const model of candidateModels) {
      // محاولة مع Grounding إن طُلب، ثم بدونها إن رفض النموذج الأدوات (400)
      const groundingAttempts: boolean[] = params.grounding ? [true, false] : [false];
      for (const useGrounding of groundingAttempts) {
        const body: Record<string, unknown> = {
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: {
            temperature: cfg.temperature,
            topP: cfg.topP,
            topK: cfg.topK,
            maxOutputTokens: cfg.maxOutputTokens,
          },
        };
        if (useGrounding) body.tools = [{ googleSearch: {} }];

        const res = await postJson(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
          null,
          body,
          cfg.timeoutMs
        );

        if (res.status === 200 && res.data) {
          const text =
            res.data.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "";
          const chunks: any[] = res.data.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
          const groundingSources = chunks
            .map((c) => ({ title: String(c?.web?.title ?? ""), url: String(c?.web?.uri ?? "") }))
            .filter((s) => s.url);
          if (text.trim()) return { text: text.trim(), model, groundingSources };
          // استجابة بلا نص (حجب/قطع) -> نجرّب الإعداد أو النموذج التالي
          lastErr = { status: 200, data: res.data };
          continue;
        }

        lastErr = { status: res.status, data: res.data };

        // اسم نموذج متقادم أو إعداد غير مقبول -> البديل التالي في السلسلة
        if (isModelMissing(res.status)) continue;

        // حصة/معدل/عطل خادم -> مشكلة على مستوى المفتاح: تبديل الاسم لا يفيد
        throw { status: res.status, message: errorMessage(res.data) };
      }
    }
    throw { status: lastErr?.status ?? 0, message: errorMessage(lastErr?.data) };
  };

  try {
    return await tryModels(models);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    if (e.status !== 404) throw err;
    // اسم النموذج غير صالح بالنسبة لهذا المفتاح -> اكتشف النموذج المتاح حالياً
    try {
      const list = await getJson(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
        null,
        15000
      );
      const names: string[] = (list.data?.models ?? []).map((m: any) => String(m?.name ?? ""));
      const flash = names
        .filter((n) => /flash/i.test(n) && !/thinking/i.test(n))
        .sort((a, b) => (b.match(/(\d+)/)?.[1] ?? "0").localeCompare(a.match(/(\d+)/)?.[1] ?? "0"));
      discovered = flash[0] ?? names[0];
    } catch {
      discovered = null;
    }
    if (!discovered) throw err;
    return tryModels([discovered]);
  }
}

async function invokeOpenAiCompatible(
  provider: string,
  baseUrl: string,
  params: LlmParams,
  system: string,
  cfg: TaskConfig,
  key: string
): Promise<InvokeOutcome> {
  const models = modelChain(provider);
  let lastErr: { status: number; message: string } | null = null;

  for (const model of models) {
    const body: Record<string, unknown> = {
      model,
      temperature: cfg.temperature,
      max_tokens: cfg.maxOutputTokens,
      messages: [{ role: "system", content: system }, ...params.messages.filter((m) => m.role !== "system")],
    };
    if (cfg.topP) body.top_p = cfg.topP;

    const res = await postJson(baseUrl, key, body, cfg.timeoutMs);
    if (res.status === 200 && res.data) {
      const choice = res.data.choices?.[0];
      const content = choice?.message?.content;
      const text =
        typeof content === "string"
          ? content
          : Array.isArray(content)
            ? content.map((c: any) => c?.text ?? "").join("")
            : "";
      if (text.trim()) return { text: text.trim(), model };
      // 200 بلا نص (مزوّد وسيط/قطع) -> نجرّب النموذج التالي
      lastErr = { status: 200, message: "استجابة فارغة من المزوّد" };
      continue;
    }

    lastErr = { status: res.status, message: errorMessage(res.data) };

    // اسم نموذج متقادم/غير متاح لهذا الحساب -> البديل التالي
    if (isModelMissing(res.status)) continue;

    throw { status: res.status, message: lastErr.message };
  }

  throw { status: lastErr?.status ?? 0, message: lastErr?.message ?? "فشل كل النماذج" };
}

async function invokeCohere(key: string, params: LlmParams, system: string, cfg: TaskConfig): Promise<InvokeOutcome> {
  const history = params.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "CHATBOT" : "USER",
      message: m.content,
    }));
  const last = history.pop() ?? { role: "USER" as const, message: "" };

  let lastErr: { status: number; message: string } | null = null;
  for (const model of modelChain("cohere")) {
    const body: Record<string, unknown> = {
      model,
      message: last.message,
      chat_history: history,
      preamble: system,
      temperature: cfg.temperature,
      p: cfg.topP,
      k: cfg.topK,
      max_tokens: cfg.maxOutputTokens,
    };
    const res = await postJson("https://api.cohere.com/v1/chat", key, body, cfg.timeoutMs);
    if (res.status === 200 && res.data?.text) {
      const text = String(res.data.text).trim();
      if (text) return { text, model };
    }
    lastErr = { status: res.status, message: errorMessage(res.data) };
    if (isModelMissing(res.status)) continue;
    throw { status: res.status, message: lastErr.message };
  }
  throw { status: lastErr?.status ?? 0, message: lastErr?.message ?? "فشل كل النماذج" };
}

interface TaskConfig {
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  timeoutMs: number;
}

// ---------------------------------------------------------------
// سلاسل النماذج: أسماء النماذج تتقادم بسرعة (404 model_not_found)،
// لذا نجرّب سلسلة بدائل لكل مزوّد بدل الاعتماد على اسم واحد.
// ---------------------------------------------------------------
const MODEL_CHAIN: Record<string, string[]> = {
  gemini: [env("GEMINI_MODEL"), "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash"],
  openrouter: [env("OPENROUTER_MODEL"), "openrouter/auto"],
  groq: [env("GROQ_MODEL"), "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3-32b"],
  deepseek: [env("DEEPSEEK_MODEL"), "deepseek-chat"],
  mistral: [env("MISTRAL_MODEL"), "open-mistral-nemo", "mistral-tiny", "mistral-small-latest"],
  cohere: [env("COHERE_MODEL"), "command-a-03-2025", "command-r-08-2024", "command-r-plus-08-2024"],
  openai: [env("OPENAI_MODEL"), "gpt-4o-mini"],
};

/** سلسلة النماذج لمزوّد (بلا تكرار، والأسماء الفارغة مستبعدة). */
function modelChain(provider: string): string[] {
  const chain = MODEL_CHAIN[provider] ?? [];
  return chain.filter((m, i, a) => Boolean(m) && a.indexOf(m) === i);
}

/** اسم موديل Gemini الافتراضي (يُستخدم في الرسائل الإرشادية) */
export function defaultModelFor(provider: string): string {
  return modelChain(provider)[0] ?? "auto";
}

/** خطأ نموذج غير متاح (404) — يستحق تجربة الاسم التالي في السلسلة */
function isModelMissing(status: number): boolean {
  return status === 404 || status === 400;
}

// ---------------------------------------------------------------
// تدوير المفاتيح (Round-Robin) — عدّاد ذري لكل مزوّد
// ---------------------------------------------------------------
const keyIndex = new Map<string, number>();

function rotate(provider: string, keys: string[]): string {
  const i = keyIndex.get(provider) ?? 0;
  keyIndex.set(provider, i + 1 >= keys.length ? 0 : i + 1);
  return keys[i];
}

// ---------------------------------------------------------------
// تبريد المزوّدين المعطوبين مؤقتاً
// سبب: حصة منتهية (429) أو رصيد صفر (402) أو مفتاح مرفوض (401/403).
// بدون هذا التبريد يخسر كل طلب ثوانيَ ثمينة في تجربة مزوّدين ميتين.
// ---------------------------------------------------------------
const cooldownUntil = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000;

function isCooling(provider: string): boolean {
  return Date.now() < (cooldownUntil.get(provider) ?? 0);
}

function markCooldown(provider: string, status: number): void {
  if (status === 429 || status === 402 || status === 401 || status === 403) {
    cooldownUntil.set(provider, Date.now() + COOLDOWN_MS);
  } else if (status === 200 || status === 0) {
    cooldownUntil.delete(provider);
  }
}

function resolveCfg(params: LlmParams, task: LlmTask): TaskConfig {
  const defaultMax = task === "hunt" ? 2048 : 1024;
  const num = (v: string) => {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };
  return {
    temperature: params.temperature ?? (num(env("AI_TEMPERATURE")) || 0.35),
    topP: params.topP ?? (num(env("AI_TOP_P")) || 0.8),
    topK: params.topK ?? (num(env("AI_TOP_K")) || 40),
    maxOutputTokens: params.maxOutputTokens ?? defaultMax,
    timeoutMs: params.timeoutMs ?? 60000,
  };
}

async function invokeProvider(
  provider: string,
  key: string,
  params: LlmParams,
  system: string,
  cfg: TaskConfig
): Promise<InvokeOutcome> {
  switch (provider) {
    case "gemini":
      return invokeGemini(key, params, system, cfg);
    case "openrouter":
      return invokeOpenAiCompatible("openrouter", "https://openrouter.ai/api/v1/chat/completions", params, system, cfg, key);
    case "groq":
      return invokeOpenAiCompatible("groq", "https://api.groq.com/openai/v1/chat/completions", params, system, cfg, key);
    case "deepseek":
      return invokeOpenAiCompatible("deepseek", "https://api.deepseek.com/chat/completions", params, system, cfg, key);
    case "mistral":
      return invokeOpenAiCompatible("mistral", "https://api.mistral.ai/v1/chat/completions", params, system, cfg, key);
    case "cohere":
      return invokeCohere(key, params, system, cfg);
    case "openai":
      return invokeOpenAiCompatible("openai", "https://api.openai.com/v1/chat/completions", params, system, cfg, key);
    default:
      throw { status: 0, message: `مزوّد غير معروف: ${provider}` };
  }
}

// ---------------------------------------------------------------
// الواجهة الرئيسية: تجربة المزوّدين والمفاتيح بالتسلسل مع التحويل
// ---------------------------------------------------------------
export async function callLlm(params: LlmParams): Promise<LlmResult> {
  const task = params.task ?? "chat";
  // المزوّدون غير المبرَّدين أولاً: نتجنب حرق الوقت في مزوّد استُهلكت حصته للتوّ
  const order = [...ROUTER[task]].sort((a, b) => Number(isCooling(a)) - Number(isCooling(b)));
  const system = params.system ?? SYSTEM_INSTRUCTIONS;
  const cfg = resolveCfg(params, task);
  const errors: LlmErrorInfo[] = [];

  for (const provider of order) {
    const keys = PROVIDER_KEYS[provider]();
    if (!keys.length) continue;
    let lastStatus = 0;
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const key = rotate(provider, keys);
      try {
        const out = await invokeProvider(provider, key, params, system, cfg);
        if (out.text) {
          markCooldown(provider, 200); // مزوّد سليم: أزل أي تبريد سابق
          return { text: out.text, provider, model: out.model, groundingSources: out.groundingSources };
        }
        errors.push({ provider, status: 0, message: "استجابة فارغة من المزوّد" });
      } catch (err) {
        const e = err as { status?: number; message?: string };
        lastStatus = e.status ?? 0;
        errors.push({ provider, status: lastStatus, message: e.message ?? String(err) });
      }
    }
    // فشلت كل مفاتيح هذا المزوّد بحصة/رصيد/صلاحية -> برّده كي لا نعيد المحاولة فوراً
    markCooldown(provider, lastStatus);
  }

  throw new LlmAllFailedError(errors);
}

/** فحص حي للمزوّدين (يُستخدم في scripts/check-env) */
export async function probeAiProviders(): Promise<{ provider: string; ok: boolean; detail: string }[]> {
  const endpoints: Record<string, string> = {
    gemini: "https://generativelanguage.googleapis.com/v1beta/models",
    openrouter: "https://openrouter.ai/api/v1/auth/key",
    groq: "https://api.groq.com/openai/v1/models",
    deepseek: "https://api.deepseek.com/models",
    mistral: "https://api.mistral.ai/v1/models",
    cohere: "https://api.cohere.com/v1/models",
    openai: "https://api.openai.com/v1/models",
  };
  const order = ["gemini", "openrouter", "groq", "deepseek", "mistral", "cohere", "openai"];
  const out: { provider: string; ok: boolean; detail: string }[] = [];
  for (const p of order) {
    const keys = PROVIDER_KEYS[p]();
    if (!keys.length) continue;
    try {
      const url = p === "gemini" ? `${endpoints[p]}?key=${encodeURIComponent(keys[0])}` : endpoints[p];
      const res = await getJson(url, p === "gemini" ? null : keys[0], 15000);
      out.push({ provider: p, ok: res.status === 200, detail: `HTTP ${res.status}` });
    } catch (err) {
      out.push({ provider: p, ok: false, detail: (err as Error).message.slice(0, 60) });
    }
  }
  return out;
}