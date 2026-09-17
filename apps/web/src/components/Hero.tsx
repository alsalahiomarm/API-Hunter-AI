"use client";

import { useEffect, useState } from "react";
import { Send, MessageCircle, MoveUpRight, ShieldCheck } from "lucide-react";
import { CHANNEL_URL, BOT_URL } from "@/lib/config";
import { useI18n } from "@/lib/i18n";

interface Stats {
  total: number;
  freeTier: number;
  freeCredit: number;
  providers: number;
}

const FALLBACK_STATS: Stats = { total: 0, freeTier: 0, freeCredit: 0, providers: 0 };

export default function Hero() {
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats>(FALLBACK_STATS);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => data?.stats && setStats(data.stats))
      .catch(() => {});
  }, []);

  return (
    <section id="top" className="hero-grid relative overflow-hidden border-b border-white/5">
      <div className="mx-auto max-w-7xl px-4 pt-16 pb-14 text-center sm:pt-24">
        <span className="badge bg-primary/10 text-primary ring-primary/30 animate-fade-up">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("hero.badge")}
        </span>

        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-[1.25] text-white animate-fade-up sm:text-5xl md:text-6xl" dangerouslySetInnerHTML={{ __html: t("hero.title") }} />

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400 animate-fade-up">
          {t("hero.description")}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-up">
          <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <Send className="h-5 w-5" />
            {t("hero.joinChannel")}
          </a>
          <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            <MessageCircle className="h-5 w-5" />
            {t("hero.tryBot")}
            <MoveUpRight className="h-4 w-4 opacity-60" />
          </a>
        </div>

        {/* شريط الإحصائيات */}
        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 animate-fade-up">
          <StatCard value={stats.total} label={t("hero.stats.total")} />
          <StatCard value={stats.freeTier} label={t("hero.stats.freeTier")} accent="text-emerald-300" />
          <StatCard value={stats.freeCredit} label={t("hero.stats.freeCredit")} accent="text-sky-300" />
          <StatCard value={stats.providers} label={t("hero.stats.providers")} accent="text-accent" />
        </div>
      </div>
    </section>
  );
}

function StatCard({
  value,
  label,
  accent = "text-primary",
}: {
  value: number;
  label: string;
  accent?: string;
}) {
  return (
    <div className="card-surface px-4 py-5">
      <div className={`text-3xl font-black tabular-nums ${accent}`}>{value}</div>
      <div className="mt-1 text-sm text-slate-400">{label}</div>
    </div>
  );
}
