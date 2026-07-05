"use client";

import { useState } from "react";
import { Ticket, Loader2, Check } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import { redeemShareCode } from "@/app/server/actions/mushaf/accessGrants";
import { Input } from "@/components/ui/input";
import { SectionCard } from "./SectionCard";

type Props = {
  onRedeemed: () => void;
};

export const RedeemCodeCard = ({ onRedeemed }: Props) => {
  const t = useTranslations();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const redeem = async () => {
    const trimmed = code.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    const result = await redeemShareCode(trimmed);
    setLoading(false);
    if (result.ok) {
      setSuccess(true);
      setCode("");
      onRedeemed();
      setTimeout(() => setSuccess(false), 2500);
    } else {
      setError(result.message);
    }
  };

  return (
    <SectionCard
      icon={Ticket}
      title={t("mushaf.redeem.title", "Access someone's mushaf")}
      description={t(
        "mushaf.redeem.description",
        "Enter a code someone shared with you to view and edit their mushaf.",
      )}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          redeem();
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder={t("mushaf.redeem.placeholder", "Enter code")}
          dir="ltr"
          autoCapitalize="characters"
          autoComplete="off"
          className="font-mono tracking-widest uppercase placeholder:tracking-normal placeholder:normal-case"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="flex-none flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground active:scale-[0.98] transition-transform duration-150 disabled:opacity-60 disabled:pointer-events-none"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Ticket className="size-4" strokeWidth={1.8} />
          )}
          {t("mushaf.redeem.button", "Redeem")}
        </button>
      </form>
      {error ? (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      ) : null}
      {success ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-primary">
          <Check className="size-3.5" strokeWidth={2} />
          {t("mushaf.redeem.success", "Access granted — see the list below.")}
        </p>
      ) : null}
    </SectionCard>
  );
};
