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
حافظ على النبرة المساعدة والإيجابية دائماً.`;

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
  const wanted = env("GEMINI_MODEL") || "gemini-2.0-flash";
  const models = [wanted, "gemini-2.0-flash", "gemini-1.5-flash"].filter((m, i, a) => a.indexOf(m) === i);

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
      if (params.grounding) body.tools = [{ googleSearch: {} }];

      const res = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
        null,
        body,
        cfg.timeoutMs
      );

      if (res.status === 200 && res.data) {
        const text =
          res.data.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "";
        const chunks: any[] = res.data.groundingMetadata?.groundingChunks ?? [];
        const groundingSources = chunks
          .map((c) => ({ title: String(c?.web?.title ?? ""), url: String(c?.web?.uri ?? "") }))
          .filter((s) => s.url);
        return { text: text.trim(), model, groundingSources };
      }
      lastErr = { status: res.status, data: res.data };
      if (res.status !== 404) throw { status: res.status, message: errorMessage(res.data) };
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
  model: string,
  key: string,
  params: LlmParams,
  system: string,
  cfg: TaskConfig
): Promise<InvokeOutcome> {
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
    const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((c: any) => c?.text ?? "").join("") : "";
    if (text) return { text: text.trim(), model };
  }
  throw { status: res.status, message: errorMessage(res.data) };
}

async function invokeCohere(key: string, params: LlmParams, system: string, cfg: TaskConfig): Promise<InvokeOutcome> {
  const model = env("COHERE_MODEL") || "command-a-plus-05-2026";
  const history = params.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "CHATBOT" : "USER",
      message: m.content,
    }));
  const last = history.pop() ?? { role: "USER" as const, message: "" };
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
    return { text: String(res.data.text).trim(), model };
  }
  throw { status: res.status, message: errorMessage(res.data) };
}

interface TaskConfig {
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  timeoutMs: number;
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
      return invokeOpenAiCompatible("openrouter", "https://openrouter.ai/api/v1/chat/completions", env("OPENROUTER_MODEL") || "openrouter/auto", key, params, system, cfg);
    case "groq":
      return invokeOpenAiCompatible("groq", "https://api.groq.com/openai/v1/chat/completions", env("GROQ_MODEL") || "qwen/qwen3.8-27b", key, params, system, cfg);
    case "deepseek":
      return invokeOpenAiCompatible("deepseek", "https://api.deepseek.com/chat/completions", env("DEEPSEEK_MODEL") || "deepseek-chat", key, params, system, cfg);
    case "mistral":
      return invokeOpenAiCompatible("mistral", "https://api.mistral.ai/v1/chat/completions", env("MISTRAL_MODEL") || "mistral-small-latest", key, params, system, cfg);
    case "cohere":
      return invokeCohere(key, params, system, cfg);
    case "openai":
      return invokeOpenAiCompatible("openai", "https://api.openai.com/v1/chat/completions", env("OPENAI_MODEL") || "gpt-4o-mini", key, params, system, cfg);
    default:
      throw { status: 0, message: `مزوّد غير معروف: ${provider}` };
  }
}

// ---------------------------------------------------------------
// الواجهة الرئيسية: تجربة المزوّدين والمفاتيح بالتسلسل مع التحويل
// ---------------------------------------------------------------
export async function callLlm(params: LlmParams): Promise<LlmResult> {
  const task = params.task ?? "chat";
  const order = ROUTER[task];
  const system = params.system ?? SYSTEM_INSTRUCTIONS;
  const cfg = resolveCfg(params, task);
  const errors: LlmErrorInfo[] = [];

  for (const provider of order) {
    const keys = PROVIDER_KEYS[provider]();
    if (!keys.length) continue;
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const key = rotate(provider, keys);
      try {
        const out = await invokeProvider(provider, key, params, system, cfg);
        if (out.text) {
          return { text: out.text, provider, model: out.model, groundingSources: out.groundingSources };
        }
        errors.push({ provider, status: 0, message: "استجابة فارغة من المزوّد" });
      } catch (err) {
        const e = err as { status?: number; message?: string };
        errors.push({ provider, status: e.status ?? 0, message: e.message ?? String(err) });
      }
    }
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