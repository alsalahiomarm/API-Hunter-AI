"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function CopyButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // بديل للمتصفحات القديمة
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [text]);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="copy"
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold transition ${
        copied
          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
          : "border-white/10 bg-white/5 text-slate-300 hover:border-primary/40 hover:text-primary"
      } ${className}`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? t("copy.copied") : t("copy.copy")}
    </button>
  );
}
