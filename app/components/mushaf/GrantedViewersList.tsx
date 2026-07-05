"use client";

import { useState } from "react";
import { Users, Loader2, Trash2 } from "lucide-react";
import useTranslations from "@hooks/use-translations";
import {
  GrantSummary,
  revokeGrant,
} from "@/app/server/actions/mushaf/accessGrants";
import { SectionCard } from "./SectionCard";
import { PersonAvatar } from "./PersonAvatar";

type Props = {
  grants: GrantSummary[];
  onRevoked: () => void;
};

export const GrantedViewersList = ({ grants, onRevoked }: Props) => {
  const t = useTranslations();
  // grantId currently pending confirm, and grantId currently being revoked.
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const revoke = async (grantId: string) => {
    setBusyId(grantId);
    const ok = await revokeGrant(grantId);
    setBusyId(null);
    setConfirmId(null);
    if (ok) onRevoked();
  };

  return (
    <SectionCard
      icon={Users}
      title={t("mushaf.viewers.title", "People who can access my mushaf")}
      description={t(
        "mushaf.viewers.description",
        "Remove anyone to instantly cut off their access.",
      )}
    >
      {grants.length === 0 ? (
        <p className="rounded-xl bg-muted px-4 py-6 text-center text-xs text-muted-foreground">
          {t("mushaf.viewers.empty", "No one has access to your mushaf.")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {grants.map((grant) => {
            const isConfirming = confirmId === grant.grantId;
            const isBusy = busyId === grant.grantId;
            return (
              <li
                key={grant.grantId}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
              >
                <PersonAvatar name={grant.user?.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {grant.user?.name ??
                      t("mushaf.unknownUser", "Unknown user")}
                  </p>
                </div>
                {isConfirming ? (
                  <div className="flex-none flex items-center gap-1">
                    <button
                      onClick={() => revoke(grant.grantId)}
                      disabled={isBusy}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-95 transition-[background-color,transform] duration-150 disabled:opacity-60"
                    >
                      {isBusy ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : null}
                      {t("mushaf.viewers.confirmRemove", "Remove")}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      disabled={isBusy}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent active:scale-95 transition-[background-color,transform] duration-150"
                    >
                      {t("mushaf.viewers.cancel", "Cancel")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(grant.grantId)}
                    aria-label={t("mushaf.viewers.remove", "Remove access")}
                    className="flex-none flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-[background-color,transform] duration-150"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.8} />
                    {t("mushaf.viewers.remove", "Remove")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
};
