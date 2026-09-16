/**
 * حزمة المنطق المشترك لبوت API Hunter AI.
 * تُستهلك من: apps/bot (التشغيل المحلي) و apps/web (Webhook على Vercel).
 */
export { createBot, getBot } from "./bot";
export { registerCommands, HELP_MSG } from "./commands";
export { publishPendingToChannel, pushServicesToChannel, listPendingServices } from "./broadcaster";
export { fetchServices, fetchLatest, isAlreadyPosted, markPosted, logUserQuery, isDatabaseReachable, isDatabaseReachableCached, saveChatMessage, getChatHistory, clearChatHistory } from "./db";
export { classifyQuery, rankServices } from "./nlu";
export type { NluResult } from "./nlu";
export { formatServiceFull, formatServiceCompact, categoriesKeyboard, channelKeyboard, CATEGORY_LABEL, STATUS_LABEL, formatServicesBody } from "./formatter";
export { callLlm, SYSTEM_INSTRUCTIONS, hasAnyAiKey, probeAiProviders, LlmAllFailedError } from "./ai";
export type { LlmMessage, LlmResult, LlmParams, LlmTask, LlmGroundingSource, LlmErrorInfo } from "./ai";
export { searchWeb } from "./web";
export type { WebResult } from "./web";
export { generateConversationalLead } from "./chat";
export type { ChatContext, ChatLead } from "./chat";