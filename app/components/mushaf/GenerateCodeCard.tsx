"use client";

import { useState } from "react";
import { KeyRound, Copy, Check, Loader2, Plus } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { requestShareCode } from "@/app/server/actions/mushaf/accessGrants";
import { SectionCard } from "./SectionCard";

export const GenerateCodeCard = () => {
  const t = useTranslations();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(false);
    setCopied(false);
    const result = await requestShareCode();
    setLoading(false);
    if (result) {
      setCode(result);
    } else {
      setError(true);
    }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (insecure context); code is still visible.
    }
  };

  return (
    <SectionCard
      hero
      icon={KeyRound}
      title={t("mushaf.generate.title", "Share my mushaf")}
      description={t(
        "mushaf.generate.description",
        "Generate a one-time code and share it. Whoever enters it can view and edit the marks on your mushaf. Each code works once.",
      )}
    >
      {code ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <span
              className="flex-1 font-mono text-lg font-bold tracking-[0.2em] text-foreground select-all"
              dir="ltr"
            >
              {code}
            </span>
            <button
              onClick={copy}
              aria-label={t("mushaf.generate.copy", "Copy code")}
              className="flex-none flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 active:scale-95 transition-[background-color,transform] duration-150"
            >
              {copied ? (
                <Check className="size-4" strokeWidth={2} />
              ) : (
                <Copy className="size-4" strokeWidth={1.8} />
              )}
              {copied
                ? t("mushaf.generate.copied", "Copied")
                : t("mushaf.generate.copy", "Copy")}
            </button>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="self-start flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground active:scale-95 transition-[background-color,transform] duration-150 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" strokeWidth={2} />
            )}
            {t("mushaf.generate.another", "Generate another code")}
          </button>
        </div>
      ) : (
        <button
          onClick={generate}
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground active:scale-[0.98] transition-transform duration-150 disabled:opacity-60 disabled:pointer-events-none"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <KeyRound className="size-4" strokeWidth={1.8} />
          )}
          {t("mushaf.generate.button", "Generate code")}
        </button>
      )}
      {error ? (
        <p className="mt-2 text-xs text-destructive">
          {t("mushaf.generate.error", "Couldn't generate a code. Try again.")}
        </p>
      ) : null}
    </SectionCard>
  );
};
