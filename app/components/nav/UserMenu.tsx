"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  User,
  LogOut,
  Bookmark,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Users,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations as useNextIntlTranslations } from "next-intl";
import useTranslations from "@hooks/use-translations";
import { toLocaleNumeral } from "@/app/utils/i18n";
import { getPendingCount, syncMarks } from "@/app/lib/marks/sync";
import { menuRowClassName } from "./NavPillLink";
import { useNotifications } from "@/app/hooks/use-notifications";
import { NotificationBell } from "@components/notifications/NotificationBell";
import { cn } from "@/lib/utils";

type Props = {
  // Renders as a full-width menu row
  menuRow?: boolean;
  // Portal target for DropdownMenuContent
  container?: HTMLElement | null;
  // Closes menu
  onNavigate?: () => void;
};

/**
 * Sign-out that flushes pending offline marks first and, if any survive the
 * flush, asks the user before dropping the session (ADR 0061 / #561). Used for
 * both `UserMenu` sign-out call sites so neither can bypass the flush.
 *
 * Never touches the marks owner stamp — `signOut()` alone leaves the store and
 * its stamp intact, which is what lets a later sign-in as the same account pick
 * the pending marks back up. This path is online-only by construction: `UserMenu`
 * renders Sign out only when `session` is truthy.
 */
const SignOutControl = ({
  menuRow,
  onNavigate,
}: {
  menuRow?: boolean;
  onNavigate?: () => void;
}) => {
  const t = useTranslations();
  const tMarks = useNextIntlTranslations("marks");
  const locale = useLocale();
  const [flushing, setFlushing] = useState(false);
  const [confirmCount, setConfirmCount] = useState<number | null>(null);

  // The dropdown unmounts this control whenever the menu closes (Escape, an
  // outside click), which can land mid-`await`. A continuation that then signs
  // out — or silently drops the confirm — is a surprise after a "never mind"
  // gesture, so every post-await branch checks this first.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const doSignOut = () => {
    onNavigate?.();
    signOut();
  };

  // One flush of the pending queue. `syncMarks()` is a module singleton, so a
  // second call while one is in flight just awaits the same run — safe to call
  // from both the sign-out attempt and "Stay and retry".
  const flush = async () => {
    setFlushing(true);
    try {
      await syncMarks();
    } catch {
      // A failed flush (network, quota) just leaves the count > 0; the caller
      // decides what to show.
    }
    if (mountedRef.current) setFlushing(false);
  };

  const requestSignOut = async () => {
    if (flushing) return;
    if (getPendingCount() === 0) {
      doSignOut();
      return;
    }
    await flush();
    if (!mountedRef.current) return;
    if (getPendingCount() === 0) {
      doSignOut();
      return;
    }
    setConfirmCount(getPendingCount());
  };

  const stayAndRetry = () => {
    setConfirmCount(null);
    void flush();
  };

  if (confirmCount != null) {
    return (
      <div className="flex flex-col gap-1.5 px-1 py-1.5">
        <p className="flex items-start gap-2 px-2 text-xs text-foreground">
          <AlertTriangle
            className="mt-0.5 size-3.5 flex-none text-warning"
            strokeWidth={1.9}
          />
          <span>
            {tMarks("signOutPending", {
              count: confirmCount,
              n: toLocaleNumeral(confirmCount, locale),
            })}
          </span>
        </p>
        <button
          type="button"
          onClick={stayAndRetry}
          className="fq-focus-ring flex min-h-10 w-full items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          {t("marks.signOutStay", "Stay and retry")}
        </button>
        <button
          type="button"
          onClick={doSignOut}
          className="fq-focus-ring flex min-h-10 w-full items-center justify-center rounded-lg px-3 text-xs font-medium text-[hsl(var(--control-inert))] transition-[background-color,color,transform] duration-150 hover:bg-[hsl(var(--well)/var(--well-alpha))] hover:text-destructive active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          {t("marks.signOutAnyway", "Sign out anyway")}
        </button>
      </div>
    );
  }

  const icon = flushing ? (
    <Loader2 className="size-4 flex-none animate-spin" />
  ) : (
    <LogOut className="size-4 flex-none" />
  );
  const label = flushing
    ? t("marks.signOutSyncing", "Syncing marks…")
    : t("signOut", "Sign out");

  if (menuRow) {
    return (
      <button
        type="button"
        className={menuRowClassName}
        disabled={flushing}
        onClick={requestSignOut}
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <DropdownMenuItem
      className="cursor-pointer"
      disabled={flushing}
      // Keep the menu open through the flush and the confirm — a plain select
      // would close it and unmount this control mid-flow.
      onSelect={(e) => {
        e.preventDefault();
        void requestSignOut();
      }}
    >
      {icon}
      {label}
    </DropdownMenuItem>
  );
};

export const UserMenu = ({ menuRow, container, onNavigate }: Props = {}) => {
  const { data: session } = useSession();
  const t = useTranslations();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const { data: notifData } = useNotifications();
  const unreadCount = notifData?.unread_count ?? 0;

  if (menuRow) {
    return (
      <div>
        <button
          type="button"
          aria-label={t("account", "Account")}
          aria-expanded={expanded}
          className={cn(menuRowClassName, "fq-focus-ring")}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="fq-well relative w-7 h-7 justify-center rounded-lg text-[hsl(var(--control-live))] flex-none">
            <User className="size-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -end-1 size-2.5 rounded-full bg-primary border-2 border-background" />
            )}
          </span>
          <span>{t("account", "Account")}</span>
          {expanded ? (
            <ChevronUp className="size-4 ms-auto text-muted-foreground flex-none" />
          ) : (
            <ChevronDown className="size-4 ms-auto text-muted-foreground flex-none" />
          )}
        </button>
        {expanded && (
          <div className="flex flex-col ps-11">
            {session ? (
              <div className="px-3 py-1.5 text-sm font-medium text-muted-foreground truncate">
                {session.user?.name}
              </div>
            ) : null}
            <Link href="/marks" locale={locale} className={menuRowClassName} onClick={onNavigate}>
              <Bookmark className="size-4 flex-none" />
              {t("marks.navLink", "My Marks")}
            </Link>
            <Link href="/plans" locale={locale} className={menuRowClassName} onClick={onNavigate}>
              <CalendarDays className="size-4 flex-none" />
              {t("plans.navLink", "My Plans")}
            </Link>
            {session ? (
              <SignOutControl menuRow onNavigate={onNavigate} />
            ) : (
              <button
                type="button"
                className={menuRowClassName}
                onClick={() => {
                  onNavigate?.();
                  signIn();
                }}
              >
                {t("signIn", "Sign in")}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu>
      {/* Neutral chrome, not --accent. The account entry says who you are —
          identity — and --accent is the state accent's family, so a saturated
          avatar put a live-state colour on the one permanently-present element
          that is never live. The unread dot keeps --primary and becomes the
          only accent on this control, which is the point. */}
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("account", "Account")}
          className="fq-focus-ring fq-well relative size-7 justify-center rounded-full text-[hsl(var(--control-live))] flex-none transition-colors"
        >
          <User className="size-[17px]" strokeWidth={1.8} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 size-3 rounded-full bg-primary border-[2px] border-background" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" container={container}>
        {session ? (
          <DropdownMenuItem className="font-medium">
            {session.user?.name}
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link href="/mushaf" locale={locale}>
            <Users className="size-4" />
            {t("mushaf.navLink", "Shared mushaf")}
          </Link>
        </DropdownMenuItem>
        <NotificationBell className="md:hidden" asDropdownItem container={container} />


        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link href="/marks" locale={locale}>
            <Bookmark className="size-4" />
            {t("marks.navLink", "My Marks")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link href="/plans" locale={locale}>
            <CalendarDays className="size-4" />
            {t("plans.navLink", "My Plans")}
          </Link>
        </DropdownMenuItem>
        {session ? (
          <SignOutControl onNavigate={onNavigate} />
        ) : (
          <DropdownMenuItem className="cursor-pointer" onClick={() => signIn()}>
            {t("signIn", "Sign in")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
