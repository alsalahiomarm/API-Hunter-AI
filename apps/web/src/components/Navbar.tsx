"use client";

import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { Radar, Send, MessageCircle, Github } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { CHANNEL_URL, BOT_URL } from "@/lib/config";

export default function Navbar() {
  const { t, isRtl } = useI18n();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-night-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="#top" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Radar className="h-5 w-5" />
          </span>
          <span className="text-lg font-black tracking-tight text-white">
            API <span className="text-primary">Hunter</span>
            <span className={`${isRtl ? "mr-1" : "ml-1"} text-accent`}>AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-bold text-slate-200 transition hover:border-primary/50 hover:text-primary sm:inline-flex"
          >
            <Send className="h-4 w-4" />
            {t("nav.channel")}
          </Link>
          <Link
            href={BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-bold text-slate-200 transition hover:border-primary/50 hover:text-primary sm:inline-flex"
          >
            <MessageCircle className="h-4 w-4" />
            {t("nav.bot")}
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-200 transition hover:text-primary"
            aria-label="GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </nav>
    </header>
  );
}
