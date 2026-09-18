/**
 * حزمة المنطق المشترك لبوت API Hunter AI.
 * تُستهلك من: apps/bot (التشغيل المحلي) و apps/web (Webhook على Vercel).
 */
export { createBot, getBot } from "./bot";
export { registerCommands, HELP_MSG, performSmartSearch } from "./commands";
export type { SearchOutcome } from "./commands";
export { publishPendingToChannel, pushServicesToChannel, listPendingServices } from "./broadcaster";
export { fetchServices, fetchLatest, isAlreadyPosted, markPosted, logUserQuery, isDatabaseReachable, isDatabaseReachableCached, saveChatMessage, getChatHistory, clearChatHistory, saveDiscoveredService, fetchRecentMatches, rememberShown, forgetShown } from "./db";
export { classifyQuery, rankServices, isApiToolRequest } from "./nlu";
export type { NluResult } from "./nlu";
export { auditLink, auditCode, auditSnippet, isLinkHealthy } from "./security";
export type { SecurityAudit, SecurityFinding, SecurityLevel } from "./security";
export { formatServiceFull, formatServiceCompact, categoriesKeyboard, channelKeyboard, CATEGORY_LABEL, STATUS_LABEL, formatServicesBody, formatWebSourcesReply, formatWebSourcesSection } from "./formatter";
export type { WebSourceLink } from "./formatter";
export { looksLikeApiService, isNonServiceHost, isContentPage, isJunkAutoRow, isJunkServiceRow, isCuratedSlug, looksLikeContentName, isAutoDiscoveredRow, displayServiceName, salvageAutoRowName, isSalvagedRow, hostOf, NON_SERVICE_HOSTS } from "./quality";
export type { WebLike } from "./quality";
export { callLlm, SYSTEM_INSTRUCTIONS, hasAnyAiKey, probeAiProviders, LlmAllFailedError } from "./ai";
export type { LlmMessage, LlmResult, LlmParams, LlmTask, LlmGroundingSource, LlmErrorInfo } from "./ai";
export { searchWeb } from "./web";
export type { WebResult } from "./web";
export { generateConversationalLead } from "./chat";
export type { ChatContext, ChatLead } from "./chat";