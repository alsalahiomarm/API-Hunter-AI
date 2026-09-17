"use client";

import { ExternalLink, BookOpen } from "lucide-react";
import type { ServiceRecord } from "@apihunter/db";
import { CategoryBadge } from "@/components/CategoryBadge";
import { StatusBadge } from "@/components/StatusBadge";
import CodeBlock from "@/components/CodeBlock";
import { freeTierSummary } from "@/lib/format";
import { localizedDescription } from "@/lib/service-i18n";
import { useI18n } from "@/lib/i18n";

export default function ServiceCard({ service: s }: { service: ServiceRecord }) {
  const { t, lang } = useI18n();

  return (
    <article className="card-surface flex flex-col gap-4 p-5 md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-white">{s.name}</h3>
          <div className="mt-1 text-sm text-slate-500">{s.provider}</div>
        </div>
        <StatusBadge status={s.status} lang={lang} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={s.category} lang={lang} />
      </div>

      <p className="text-sm leading-6 text-slate-400">{localizedDescription(s, lang)}</p>

      <ul className="space-y-1.5 rounded-xl border border-white/5 bg-night-800/50 p-3 text-xs leading-5 text-slate-300">
        {freeTierSummary(s, lang).map((line, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
            {line}
          </li>
        ))}
      </ul>

      <CodeBlock code={s.codeExample} />

      <div className="flex items-center gap-2">
        <a
          href={s.activationLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex-1 justify-center !px-3 !py-2 text-sm"
        >
          <ExternalLink className="h-4 w-4" />
          {t("card.activateNow")}
        </a>
        <a
          href={s.documentationLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost flex-1 justify-center !px-3 !py-2 text-sm"
        >
          <BookOpen className="h-4 w-4" />
          {t("card.documentation")}
        </a>
      </div>
    </article>
  );
}
