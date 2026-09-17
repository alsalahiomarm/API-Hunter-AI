"use client";

import { Code2 } from "lucide-react";
import CopyButton from "@/components/CopyButton";
import { detectLanguage } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

const LANG_LABEL: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  bash: "Bash (cURL)",
  text: "Tech",
};

export default function CodeBlock({ code }: { code: string }) {
  const { t } = useI18n();
  const lang = detectLanguage(code);
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-night-950">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
          <Code2 className="h-3.5 w-3.5 text-primary" />
          {LANG_LABEL[lang]}
        </span>
        <CopyButton text={code} />
      </div>
      <pre
        dir="ltr"
        className="code-scroll max-h-56 whitespace-pre text-left text-neutral-300"
      >
        <code>{code || t("code.noCode")}</code>
      </pre>
    </div>
  );
}
