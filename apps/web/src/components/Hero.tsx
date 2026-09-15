"use client";

import { useEffect, useState } from "react";
import { Send, MessageCircle, MoveUpRight, ShieldCheck } from "lucide-react";
import { CHANNEL_URL, BOT_URL } from "@/lib/config";

interface Stats {
  total: number;
  freeTier: number;
  freeCredit: number;
  providers: number;
}

const FALLBACK_STATS: Stats = { total: 0, freeTier: 0, freeCredit: 0, providers: 0 };

export default function Hero() {
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
          وكيل اصطياد يعمل يومياً على مدار الساعة
        </span>

        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-[1.25] text-white animate-fade-up sm:text-5xl md:text-6xl">
          اصطاد <span className="text-primary">مفاتيح API مجانية</span>
          <br />
          <span className="text-accent">حقيقية</span> و{` `}خطط Free Tier محدّثة
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400 animate-fade-up">
          وكيل ذكاء اصطناعي يمسح أدلة GitHub والمنتديات ومدونات المطورين يومياً،
          يحلّل البيانات، ويتحقق من الروابط، ثم ينشرها هنا وعلى قناة تليجرام
          فور اكتشافها.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-up">
          <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <Send className="h-5 w-5" />
            انضم لقناة تليجرام
          </a>
          <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            <MessageCircle className="h-5 w-5" />
            جرّب البوت
            <MoveUpRight className="h-4 w-4 opacity-60" />
          </a>
        </div>

        {/* شريط الإحصائيات */}
        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 animate-fade-up">
          <StatCard value={stats.total} label="خدمة مكتشفة" />
          <StatCard value={stats.freeTier} label="مجانية كلياً" accent="text-emerald-300" />
          <StatCard value={stats.freeCredit} label="برصيد مجاني" accent="text-sky-300" />
          <StatCard value={stats.providers} label="مزود مختلف" accent="text-accent" />
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