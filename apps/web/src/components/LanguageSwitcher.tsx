"use client";

import { useI18n } from "@/lib/i18n";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { lang, setLang, isRtl } = useI18n();

  return (
    <div className="relative inline-flex items-center rounded-lg border border-white/10 bg-night-800/60 p-0.5" dir="ltr">
      <button
        type="button"
        onClick={() => setLang("ar")}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition ${
          lang === "ar"
            ? "bg-primary/20 text-primary ring-1 ring-primary/40"
            : "text-slate-400 hover:text-slate-200"
        }`}
        aria-label="العربية"
        dir="rtl"
      >
        <span className="text-sm">🇸🇦</span>
        <span className="hidden sm:inline">عربي</span>
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition ${
          lang === "en"
            ? "bg-primary/20 text-primary ring-1 ring-primary/40"
            : "text-slate-400 hover:text-slate-200"
        }`}
        aria-label="English"
        dir="ltr"
      >
        <span className="text-sm">🇺🇸</span>
        <span className="hidden sm:inline">English</span>
      </button>
    </div>
  );
}
