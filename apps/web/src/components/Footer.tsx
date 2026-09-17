"use client";

import { Send, MessageCircle, Radar } from "lucide-react";
import { CHANNEL_URL, BOT_URL } from "@/lib/config";
import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t, isRtl } = useI18n();

  return (
    <footer className="border-t border-white/5 bg-night-900">
      {/* دعوة الانضمام */}
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div
          className={`card-surface flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:justify-between ${
            isRtl ? "sm:text-right" : "sm:text-left"
          }`}
        >
          <div>
            <h3 className="text-2xl font-black text-white">
              {t("footer.ctaTitle")}
            </h3>
            <p className="mt-2 text-slate-400">
              {t("footer.ctaDescription")}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-3">
            <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <Send className="h-5 w-5" />
              {t("footer.channel")}
            </a>
            <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              <MessageCircle className="h-5 w-5" />
              {t("footer.bot")}
            </a>
          </div>
        </div>
      </div>

      {/* التذييل */}
      <div className="border-t border-white/5 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row">
          <span className="inline-flex items-center gap-2 font-bold">
            <Radar className="h-4 w-4 text-primary" />
            {t("footer.brand")}
          </span>
          <span>{t("footer.disclaimer")}</span>
        </div>
      </div>
    </footer>
  );
}
