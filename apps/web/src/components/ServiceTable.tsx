"use client";

import { ExternalLink, BookOpen } from "lucide-react";
import type { ServiceRecord } from "@apihunter/db";
import { CategoryBadge } from "@/components/CategoryBadge";
import { StatusBadge } from "@/components/StatusBadge";
import CodeBlock from "@/components/CodeBlock";
import { freeTierSummary } from "@/lib/format";

export default function ServiceTable({ services }: { services: ServiceRecord[] }) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-night-850 md:block">
      <table className="w-full border-collapse text-right text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-night-800/60 text-xs font-black uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3.5">الخدمة</th>
            <th className="px-4 py-3.5">التصنيف</th>
            <th className="w-[30%] px-4 py-3.5">الخطة المجانية</th>
            <th className="px-4 py-3.5">الحالة</th>
            <th className="px-4 py-3.5">مثال الكود</th>
            <th className="px-4 py-3.5">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr
              key={s.id}
              className="border-b border-white/5 align-top transition hover:bg-white/[0.03]"
            >
              <td className="px-4 py-4">
                <div className="font-black text-white">{s.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{s.provider}</div>
                <p className="mt-1.5 text-xs leading-5 text-slate-400">{s.description}</p>
              </td>
              <td className="px-4 py-4">
                <CategoryBadge category={s.category} />
              </td>
              <td className="px-4 py-4">
                <ul className="space-y-1 text-xs leading-5 text-slate-300">
                  {freeTierSummary(s).map((line, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                      {line}
                    </li>
                  ))}
                </ul>
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={s.status} />
              </td>
              <td className="max-w-[340px] px-4 py-4">
                <CodeBlock code={s.codeExample} />
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-col gap-2">
                  <a
                    href={s.activationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-black text-primary ring-1 ring-inset ring-primary/30 transition hover:bg-primary/25"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    تفعيل الآن
                  </a>
                  <a
                    href={s.documentationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-primary/40 hover:text-primary"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    التوثيق
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}