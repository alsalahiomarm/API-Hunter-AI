/**
 * حزمة المنطق المشترك لبوت API Hunter AI.
 * تُستهلك من: apps/bot (التشغيل المحلي) و apps/web (Webhook على Vercel).
 */
export { createBot, getBot } from "./bot";
export { registerCommands, HELP_MSG } from "./commands";
export { publishPendingToChannel, pushServicesToChannel, listPendingServices } from "./broadcaster";
export { fetchServices, fetchLatest, isAlreadyPosted, markPosted, logUserQuery, isDatabaseReachable } from "./db";
export { classifyQuery, rankServices } from "./nlu";
export type { NluResult } from "./nlu";
export { formatServiceFull, formatServiceCompact, categoriesKeyboard, channelKeyboard, CATEGORY_LABEL, STATUS_LABEL } from "./formatter";