import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { signIn, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations as useNextIntlTranslations } from "next-intl";
import {
  Bookmark,
  BookOpen,
  Check,
  Copy,
  Eraser,
  Loader2,
  Send,
  Share2,
  User,
  Volume1,
  Volume2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { MarkerColorPicker } from "./MarkerColorPicker";
import { useMarks } from "../hooks/use-marks";
import { syncMarks } from "@/app/lib/marks/sync";
import { useOnlineStatus } from "../hooks/use-online-status";
import { VerseForMark, WordWithVerse } from "../types/prisma";
import { useRecitation } from "@/app/contexts/RecitationContext";
import { useTafsirModal } from "@/app/contexts/TafsirContext";
import { getWordAudioUrl } from "../constants/word-audio";
import { addPageMark } from "../server/actions/addPageMark";
import { deletePageMark } from "../server/actions/deletePageMark";
import useTranslations from "../hooks/use-translations";
import { getLanguageDirection, toLocaleNumeral } from "@/app/utils/i18n";
import { getSurahMeta, normalizeVerseKey } from "@/app/utils/quran-navigation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCloseOnBackGesture } from "@/app/hooks/use-close-on-back-gesture";
import { formatVerseSharePayload } from "@/app/utils/share-verse";
import { MARK_CATEGORIES, markKey as toMarkKey } from "@/app/constants/marks";
import {
  setLocalMark,
  tombstoneLocalMark,
  getOwnerSnapshot,
  getServerOwnerSnapshot,
  getSnapshot,
  getServerSnapshot,
  subscribe,
  type LocalMark,
} from "@/app/lib/marks/store";
import { isStandaloneDisplayMode } from "@/app/utils/platform";
import { storage } from "@/app/utils/storage";
import { evaluateMarkModalGates } from "@/app/lib/marks/gates";

const COMMENT_MAX_LENGTH = 500;

// Shared styling for the cells of the modal's quiet utility rail (Play / Tafsir
// / Copy / Share).
const RAIL_BUTTON_CLASS =
  "flex min-h-12 items-center justify-center gap-1.5 px-1.5 py-2 text-[11px] font-medium text-foreground transition-[background-color,color,transform] duration-150 hover:bg-accent active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:text-xs";

type ModalProps = {
  isOpen: boolean;
  close: () => void;
  markFor: WordWithVerse | VerseForMark;
  verseDisplayText?: string;
  // The current mark's category key + optional comment, when this spot is
  // already marked (ADR 0025 — one mark per spot).
  currentCategory?: string;
  currentComment?: string;
  // Author of the mark, shown only when it wasn't made by the current viewer
  // (e.g. a teacher's mark on a student's mushaf). See ADR 0012.
  authorName?: string | null;
  // When set, add/remove operate on the granted mushaf instead of the viewer's.
  grantId?: string;
};

// Crafted 24x24 SVG icons matching Lucide's 1.8 stroke-width and geometry.
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a0.5 0.5 0 0 0 1 0V9a0.5 0.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a0.5 0.5 0 0 0 0-1h-1a0.5 0.5 0 0 0 0 1" />
    </svg>
  );
}

// Official X brand icon
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="currentColor"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

const MarkedByLine = ({ authorName }: { authorName?: string | null }) => {
  const t = useTranslations();

  if (!authorName) return null;

  return (
    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted text-xs text-muted-foreground border border-border/60">
      <User className="size-3" strokeWidth={1.8} />
      <span>
        {t("markModal.markedBy", "Marked by")} {authorName}
      </span>
    </div>
  );
};

const getTitle = (
  markFor: WordWithVerse | VerseForMark,
  verseDisplayText?: string,
) => {
  if ("location" in markFor) {
    return markFor.qpc_uthmani_hafs;
  }

  // Verse-level mark: the caller (QuranSafha.selectWord) always supplies
  // verseDisplayText (built from the verse's words), so the full verse text no
  // longer travels on every page word — see ADR 0028 / VerseForMark.
  return verseDisplayText ?? "";
};

export function MarkModal({
  isOpen,
  close,
  markFor,
  verseDisplayText,
  currentCategory,
  currentComment,
  authorName,
  grantId,
}: ModalProps) {
  const { reload: reloadMarks } = useMarks([markFor.page_number], grantId);
  const { data: session } = useSession();
  const ownerStamp = useSyncExternalStore(subscribe, getOwnerSnapshot, getServerOwnerSnapshot);
  const marksSnapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isStandalone, setIsStandalone] = useState(() =>
    typeof window !== "undefined" ? isStandaloneDisplayMode() : false,
  );
  useEffect(() => {
    setIsStandalone(isStandaloneDisplayMode());
  }, []);

  const [promptDismissed, setPromptDismissed] = useState(() =>
    typeof window !== "undefined" ? Boolean(storage.get("guestMarkPromptDismissed")) : false,
  );
  useEffect(() => {
    setPromptDismissed(Boolean(storage.get("guestMarkPromptDismissed")));
  }, []);

  const dismissGuestPrompt = () => {
    setPromptDismissed(true);
    storage.set("guestMarkPromptDismissed", true);
  };

  const t = useTranslations();
  const markT = useNextIntlTranslations("markModal");
  const locale = useLocale();
  const pathname = usePathname();
  const [error, setError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);
  const [comment, setComment] = useState(currentComment ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const { play, status: recitationStatus, togglePlayPause } = useRecitation();
  const { openTafsir } = useTafsirModal();
  useCloseOnBackGesture(isOpen, close);
  const wordAudioRef = useRef<HTMLAudioElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current); }, []);
  const [resolvedShareText, setResolvedShareText] = useState<string | null>(null);
  // When the browser can open the OS share sheet, the Share button does that
  // directly and the platform popover is not rendered (it stays as the
  // fallback for desktop Firefox/Safari). Feature-detected after mount so SSR
  // and first render agree.
  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);
  const [isSharing, setIsSharing] = useState(false);
  // Memoised verse-text resolution, so the native path can start fetching on
  // pointer-intent and still have the text ready when the click fires (an
  // await between the user gesture and navigator.share() loses activation on
  // Safari).
  const shareTextPromiseRef = useRef<Promise<string> | null>(null);
  // Popover portal target — nesting a Popover inside a Dialog must portal into
  // the Dialog's own content node, not document.body, or the Dialog's
  // FocusScope keeps yanking focus back into itself. See DECISIONS.md, "UI
  // Component Library" (RecitationSettingsSheet's reciter combobox).
  const [dialogContentEl, setDialogContentEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCategory(currentCategory);
    setComment(currentComment ?? "");
    setError(false);
  }, [currentCategory, currentComment, isOpen]);

  // Drop any verse text cached for a different verse/word — keyed on the mark
  // identity, not the modal-open effect, so a comment edit doesn't reset it.
  const markKey = "location" in markFor ? markFor.location : markFor.verse_key;
  useEffect(() => {
    shareTextPromiseRef.current = null;
    setResolvedShareText(null);
  }, [markKey]);

  const isWord = "location" in markFor;
  const markedType = isWord ? "word" : "verse";
  const markedId = isWord ? markFor.location : markFor.verse_key;

  const { canMark, inputsDisabled } = evaluateMarkModalGates({
    sessionUser: session?.user,
    ownerStamp,
    isOffline,
    isStandalone,
    grantId,
  });

  const isGuest = ownerStamp === "guest";
  const showGuestPrompt = isGuest && !grantId && isStandalone && !promptDismissed;

  const currentKey = toMarkKey({ marked_type: markedType, marked_id: markedId });
  const currentLocalMark = !grantId ? marksSnapshot[currentKey] : undefined;
  const isPending = Boolean(currentLocalMark && !currentLocalMark.deleted && currentLocalMark.sync === "pending");

  const selectedCategoryMeta = MARK_CATEGORIES.find(({ key }) => key === selectedCategory);
  const selectedCategoryLabel = selectedCategoryMeta
    ? t(selectedCategoryMeta.labelKey, selectedCategoryMeta.defaultLabel)
    : "";
  const submitLabel = selectedCategory
    ? currentCategory
      ? markT("updateMarkWithCategory", { category: selectedCategoryLabel })
      : markT("saveMarkWithCategory", { category: selectedCategoryLabel })
    : t("markModal.saveMark", "Save Mark");

  // Header metadata resolution
  const normalizedVerseKey = normalizeVerseKey(markFor.verse_key) ?? "1:1";
  const [surahStr, ayahStr] = normalizedVerseKey.split(":");
  const surahNum = parseInt(surahStr, 10);
  const ayahNum = parseInt(ayahStr, 10);
  const surahMeta = getSurahMeta(surahNum);
  const surahName = surahMeta
    ? locale === "ar"
      ? surahMeta.nameArabic
      : surahMeta.nameSimple
    : "";
  const localizedAyah = toLocaleNumeral(ayahNum, locale);

  const fallbackVerseText = isWord ? markFor.qpc_uthmani_hafs : (verseDisplayText ?? "");

  const buildMarkMetadata = () => ({
    snippet: fallbackVerseText,
    chapter_name_simple: surahMeta?.nameSimple ?? "",
    chapter_name_arabic: surahMeta?.nameArabic ?? "",
    verse_number: ayahNum,
  });

  const resolveVerseText = async (): Promise<string> => {
    if (!isOnline) return fallbackVerseText;
    try {
      const res = await fetch(`/api/quran/verses/${encodeURIComponent(normalizedVerseKey)}`);
      const json = await res.json();
      // text_plain is standard Unicode Arabic — safe to paste outside the app.
      // text_uthmani is font-encoded (qpc_uthmani_hafs) and must not be shared.
      return json?.data?.text_plain ?? fallbackVerseText;
    } catch {
      return fallbackVerseText;
    }
  };

  // Per-verse share route (ADR 0050) — carries an Open Graph card and redirects
  // to the canonical reader with the 'selection' highlight so the verse is
  // pointed to on arrival. Every share target (native sheet, platform links,
  // Copy) uses this URL.
  const buildShareUrl = (): string =>
    `${window.location.origin}/${locale}/share/verse/${surahNum}/${ayahNum}`;

  const resolveShareText = (): Promise<string> => {
    if (!shareTextPromiseRef.current) {
      shareTextPromiseRef.current = resolveVerseText();
    }
    return shareTextPromiseRef.current;
  };

  const buildPayload = async (): Promise<string> => {
    const verseText = await resolveShareText();
    const payload = formatVerseSharePayload({ verseText, surahName, ayahNum, locale });
    return `${payload}\n${buildShareUrl()}`;
  };

  const handleNativeShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const verseText = await resolveShareText();
      const payload = formatVerseSharePayload({ verseText, surahName, ayahNum, locale });
      await navigator.share({
        title: `${surahName} · ${localizedAyah}`,
        text: payload,
        url: buildShareUrl(),
      });
    } catch (err) {
      // AbortError = user dismissed the sheet — nothing to do. Any other
      // rejection (e.g. NotAllowedError when the priming fetch outran the user
      // gesture on Safari) means the sheet never opened — fall back to Copy so
      // the button still does something.
      if (!(err instanceof Error) || err.name === "AbortError") return;
      await copyVerse();
    } finally {
      setIsSharing(false);
    }
  };

  const markCopied = () => {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    setIsCopied(true);
    copiedTimerRef.current = setTimeout(() => setIsCopied(false), 2000);
  };

  const writeToClipboard = async (payload: string) => {
    await navigator.clipboard.writeText(payload);
    markCopied();
  };

  const copyVerse = async () => {
    try {
      await writeToClipboard(await buildPayload());
    } catch {
      // clipboard denied — silent fail
    }
  };

  const SHARE_PLATFORMS = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      Icon: WhatsAppIcon,
      hoverClass: "hover:text-primary hover:bg-primary/10",
    },
    {
      key: "telegram",
      label: "Telegram",
      Icon: Send,
      hoverClass: "hover:text-primary hover:bg-primary/10",
    },
    {
      key: "x",
      label: "X",
      Icon: XIcon,
      hoverClass: "hover:text-foreground hover:bg-accent",
    },
    {
      key: "facebook",
      label: "Facebook",
      Icon: FacebookIcon,
      hoverClass: "hover:text-primary hover:bg-primary/10",
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      Icon: LinkedInIcon,
      hoverClass: "hover:text-primary hover:bg-primary/10",
    },
  ] as const;

  const buildPlatformHref = (platform: string, verseText: string): string => {
    const pageUrl = buildShareUrl();
    // LinkedIn/Facebook ignore any text param and scrape the Open Graph card
    // from 'pageUrl' (the /share/verse route) instead — only 'url' is sent for
    // those two. The other platforms render their preview from the same card.
    // The full verse text is always sent — X may open its composer over the
    // 280-char limit for a handful of long verses; the user trims it, we never
    // cut scripture.
    const payload = formatVerseSharePayload({ verseText, surahName, ayahNum, locale });
    const full = `${payload}\n${pageUrl}`;
    switch (platform) {
      case "whatsapp":  return `https://wa.me/?text=${encodeURIComponent(full)}`;
      case "telegram":  return `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(payload)}`;
      case "x":         return `https://x.com/intent/post?text=${encodeURIComponent(full)}`;
      case "facebook":  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
      case "linkedin":  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
      default:          return "#";
    }
  };

  const handleShareOpenChange = async (open: boolean) => {
    if (open && !resolvedShareText) {
      setResolvedShareText(await resolveShareText());
    }
  };

  const playFromHere = () => {
    play(markFor.verse_key);
    close();
  };

  const viewTafsir = () => {
    const snippet =
      "location" in markFor
        ? markFor.qpc_uthmani_hafs
        : (verseDisplayText ?? "");

    openTafsir(markFor.verse_key, snippet);
    close();
  };

  const playWordPronunciation = () => {
    if (!("location" in markFor) || !markFor.audio_url) return;
    const audioUrl = getWordAudioUrl(markFor.audio_url);
    if (!audioUrl) return;

    if (recitationStatus === "playing") togglePlayPause();

    if (wordAudioRef.current) {
      wordAudioRef.current.src = audioUrl;
      wordAudioRef.current.play();
    }
  };

  const saveMark = async () => {
    if (!selectedCategory || isSaving) return;
    setError(false);
    setIsSaving(true);

    if (grantId) {
      try {
        const added = await addPageMark(
          {
            category: selectedCategory,
            marked_type: markedType,
            marked_id: markedId,
            page_number: markFor.page_number,
            comment: comment.trim() || undefined,
          },
          grantId,
        );

        if (added) {
          reloadMarks();
          close();
        } else {
          setError(true);
        }
      } finally {
        setIsSaving(false);
      }
      return;
    }

    try {
      const metadata = buildMarkMetadata();
      const newLocalMark: LocalMark = {
        marked_type: markedType,
        marked_id: markedId,
        page_number: markFor.page_number,
        category: selectedCategory,
        comment: comment.trim() || null,
        snippet: metadata.snippet,
        chapter_name_simple: metadata.chapter_name_simple,
        chapter_name_arabic: metadata.chapter_name_arabic,
        verse_number: metadata.verse_number,
        ...(currentLocalMark?.from_user !== undefined ? { from_user: currentLocalMark.from_user } : {}),
        ...(currentLocalMark?.author_name !== undefined ? { author_name: currentLocalMark.author_name } : {}),
        deleted: false,
        updated_at: Date.now(),
        sync: "pending",
      };

      setLocalMark(newLocalMark);
      void syncMarks();
      // The store write is synchronous and `close()` unmounts this modal, so the
      // reset is belt-and-braces — but it keeps the flag honest if the modal ever
      // stops unmounting on close, where a stuck `true` would disable Save + Remove.
      setIsSaving(false);
      close();
    } catch (err) {
      console.error("Failed to save local mark:", err);
      setError(true);
      setIsSaving(false);
    }
  };

  const removeMark = async () => {
    if (isRemoving) return;
    setError(false);
    setIsRemoving(true);

    if (grantId) {
      try {
        const removed = await deletePageMark(
          {
            marked_type: markedType,
            marked_id: markedId,
            page_number: markFor.page_number,
          },
          grantId,
        );

        if (removed) {
          reloadMarks();
          close();
        } else {
          setError(true);
        }
      } finally {
        setIsRemoving(false);
      }
      return;
    }

    try {
      const metadata = buildMarkMetadata();
      tombstoneLocalMark(markedType, markedId, {
        page_number: markFor.page_number,
        category: selectedCategory,
        comment: comment.trim() || null,
        snippet: metadata.snippet,
        chapter_name_simple: metadata.chapter_name_simple,
        chapter_name_arabic: metadata.chapter_name_arabic,
        verse_number: metadata.verse_number,
        ...(currentLocalMark?.from_user !== undefined ? { from_user: currentLocalMark.from_user } : {}),
        ...(currentLocalMark?.author_name !== undefined ? { author_name: currentLocalMark.author_name } : {}),
      });

      void syncMarks();
      // Belt-and-braces: `close()` unmounts this modal, but reset the flag so it
      // stays honest if the modal ever stops unmounting on close.
      setIsRemoving(false);
      close();
    } catch (err) {
      console.error("Failed to tombstone local mark:", err);
      setError(true);
      setIsRemoving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        ref={setDialogContentEl}
        hideDefaultClose
        dir={getLanguageDirection(locale)}
        className="fq-panel-cast left-0 right-0 top-auto bottom-0 flex w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-visible rounded-t-[1.5rem] border-x-0 border-b-0 bg-card p-0 sm:left-[50%] sm:right-auto sm:top-[50%] sm:bottom-auto sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
      >
        <div className="flex-none space-y-3 overflow-hidden px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          {/* In-flow header keeps orientation balanced without competing with scripture. */}
          <div className="flex items-center gap-2">
            <DialogClose
              className="fq-focus-ring shrink-0 rounded-lg p-2 text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-accent hover:text-accent-foreground active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100"
              aria-label={t("markModal.close", "Close mark panel")}
            >
              <X className="h-4 w-4" />
            </DialogClose>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] font-medium text-primary">
                {isWord
                  ? t("markModal.markWordLabel", "Mark word")
                  : t("markModal.markVerseLabel", "Mark verse")}
              </p>
              <div className="mt-0.5 flex items-center justify-center gap-2">
                <span className="fq-rule-mark" aria-hidden="true" />
                <p className="truncate text-sm font-medium text-foreground">
                  {surahName} <span className="text-muted-foreground">·</span> {localizedAyah}
                </p>
                <span className="fq-rule-mark fq-rule-mark--flip" aria-hidden="true" />
              </div>
            </div>
            <span className="size-8 shrink-0" aria-hidden="true" />
          </div>

          <div className="px-1 text-center">
            <div className="flex items-center justify-center gap-2.5">
              <DialogTitle
                className="font-uthmanic line-clamp-2 text-base font-medium leading-[1.9] tracking-normal text-foreground select-text sm:line-clamp-none sm:text-lg"
                dir="rtl"
              >
                {getTitle(markFor, verseDisplayText)}
              </DialogTitle>
              {isWord && markFor.audio_url ? (
                <button
                  type="button"
                  onClick={playWordPronunciation}
                  className="fq-focus-ring shrink-0 rounded-lg p-1.5 text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-accent hover:text-foreground active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100"
                  aria-label={t("markModal.playPronunciation", "Hear pronunciation")}
                >
                  <Volume1 className="h-4 w-4 text-primary" strokeWidth={1.8} />
                </button>
              ) : null}
            </div>
            <MarkedByLine authorName={authorName} />
            <DialogDescription className="sr-only">
              {isWord
                ? t("markModal.markWordLabel", "Mark word")
                : t("markModal.markVerseLabel", "Mark verse")}
            </DialogDescription>
          </div>

          {/* The supporting actions read as one quiet utility rail. When the OS
              share sheet is available, Copy and Share each get their own cell
              (4-up); otherwise Copy lives inside the Share popover (3-up). */}
          <div
            className={cn(
              "grid overflow-hidden rounded-xl border border-border/80 bg-card/60 divide-x divide-border/70 rtl:divide-x-reverse",
              canNativeShare ? "grid-cols-4" : "grid-cols-3",
            )}
          >
          <button
            type="button"
            onClick={playFromHere}
            className={RAIL_BUTTON_CLASS}
          >
            <Volume2 className="w-4 h-4 shrink-0 text-primary" strokeWidth={1.8} />
            <span className="truncate">{t("markModal.playFromHere", "Play from here")}</span>
          </button>
          <button
            type="button"
            onClick={viewTafsir}
            className={RAIL_BUTTON_CLASS}
          >
            <BookOpen className="w-4 h-4 shrink-0 text-primary" strokeWidth={1.8} />
            <span className="truncate">{t("markModal.viewTafsir", "Tafsir")}</span>
          </button>
          {canNativeShare ? (
            <>
              <button
                type="button"
                onClick={copyVerse}
                aria-label={isCopied ? t("markModal.copied", "Copied") : t("markModal.copyVerse", "Copy verse")}
                className={cn(RAIL_BUTTON_CLASS, isCopied && "text-primary")}
              >
                {isCopied ? (
                  <Check className="w-4 h-4 shrink-0 text-primary" strokeWidth={2} />
                ) : (
                  <Copy className="w-4 h-4 shrink-0 text-primary" strokeWidth={1.8} />
                )}
                <span className="truncate">
                  {isCopied ? t("markModal.copied", "Copied") : t("markModal.copyVerse", "Copy verse")}
                </span>
              </button>
              <button
                type="button"
                onClick={handleNativeShare}
                onPointerDown={() => { void resolveShareText(); }}
                onFocus={() => { void resolveShareText(); }}
                disabled={isSharing}
                aria-label={t("markModal.shareVerse", "Share verse")}
                className={cn(RAIL_BUTTON_CLASS, "disabled:opacity-60")}
              >
                {isSharing ? (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <Share2 className="w-4 h-4 shrink-0 text-primary" strokeWidth={1.8} />
                )}
                <span className="truncate">{t("markModal.shareVerse", "Share verse")}</span>
              </button>
            </>
          ) : (
          <Popover onOpenChange={handleShareOpenChange}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t("markModal.shareVerse", "Share verse")}
                className={cn(RAIL_BUTTON_CLASS, "w-full data-[state=open]:bg-primary/10 data-[state=open]:text-primary")}
              >
                <Share2 className="w-4 h-4 shrink-0 text-primary" strokeWidth={1.8} />
                <span className="truncate">{t("markModal.shareVerse", "Share verse")}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              container={dialogContentEl}
              className="fq-panel-cast w-auto rounded-xl border border-border bg-popover p-1.5 shadow-md"
              align="center"
              sideOffset={6}
            >
              <span className="sr-only">{t("markModal.shareViaLabel", "Share via")}</span>
              {resolvedShareText === null ? (
                <div className="flex items-center justify-center px-4 py-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={copyVerse}
                    aria-label={isCopied ? t("markModal.copied", "Copied") : t("markModal.copyVerse", "Copy verse")}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent active:scale-90 transition-colors duration-150 shrink-0",
                      isCopied && "text-primary bg-primary/10",
                    )}
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4" strokeWidth={2} />
                    ) : (
                      <Copy className="w-4 h-4" strokeWidth={1.8} />
                    )}
                  </button>
                  <div className="w-px h-4 bg-border mx-0.5 shrink-0" />
                  {SHARE_PLATFORMS.map(({ key, label, Icon, hoverClass }) => (
                    <a
                      key={key}
                      href={buildPlatformHref(key, resolvedShareText)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground active:scale-90 transition-colors duration-150 shrink-0",
                        hoverClass,
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
          )}
          </div>

          {canMark ? (
            <div className="space-y-2.5">
              {showGuestPrompt ? (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate">
                      {t("markModal.guestPrompt", "Sign in to keep your marks across devices")}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        signIn("google", {
                          callbackUrl: `${pathname}?markWord=${encodeURIComponent(markKey)}`,
                        })
                      }
                      className="shrink-0 font-medium text-primary hover:underline"
                    >
                      {t("signIn", "Sign in")}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={dismissGuestPrompt}
                    className="shrink-0 rounded p-0.5 text-muted-foreground/70 transition-colors hover:text-foreground"
                    aria-label={t("markModal.dismissGuestPrompt", "Dismiss")}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : null}

              <div>
                <div className="mb-2 flex items-center gap-3">
                  <p className="shrink-0 text-[11px] font-medium text-muted-foreground">
                    {t("markModal.chooseCategoryLabel", "Add a review mark")}
                  </p>
                  <div className="h-px flex-1 bg-border/70" />
                </div>
                <MarkerColorPicker
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  disabled={inputsDisabled}
                />
              </div>

              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
                maxLength={COMMENT_MAX_LENGTH}
                disabled={inputsDisabled}
                aria-label={t("markModal.commentPlaceholder", "Add a comment (optional)…")}
                placeholder={t("markModal.commentPlaceholder", "Add a comment (optional)…")}
                dir={getLanguageDirection(locale)}
                className="h-[clamp(2.75rem,12dvh,5.25rem)] resize-none rounded-xl border-border/80 bg-card text-start text-base placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary sm:text-sm"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border/80 bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {t("markModal.signInToMark", "Sign in to mark words and verses")}
              </p>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6"
                onClick={() =>
                  signIn("google", {
                    callbackUrl: `${pathname}?markWord=${encodeURIComponent(markKey)}`,
                  })
                }
              >
                {t("signIn", "Sign in")}
              </Button>
            </div>
          )}
        </div>
        {canMark ? (
          <div className="shrink-0 border-t border-border/80 bg-card px-4 py-2.5 sm:px-5">
            <button
              type="button"
              onClick={saveMark}
              disabled={!selectedCategory || inputsDisabled || isSaving || isRemoving}
              className="flex min-h-12 w-full items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-xs transition-[background-color,transform] duration-150 hover:bg-primary/95 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <span className="flex size-12 shrink-0 items-center justify-center border-e border-primary-foreground/20">
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Bookmark className="size-4" strokeWidth={1.8} />}
              </span>
              <span className="flex-1 px-3 text-center">{submitLabel}</span>
            </button>
            {currentCategory ? (
              <button
                type="button"
                onClick={removeMark}
                disabled={inputsDisabled || isSaving || isRemoving}
                className="mt-1.5 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-medium text-destructive transition-[background-color,transform] duration-150 hover:bg-destructive/10 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                {isRemoving ? <Loader2 className="size-3.5 animate-spin" /> : <Eraser className="size-3.5" strokeWidth={1.8} />}
                {t("markModal.removeMark", "Remove Mark")}
              </button>
            ) : null}
            {error ? (
              <p role="alert" className="mt-2 text-center text-xs text-destructive">
                {t("markModal.actionError", "Something went wrong. Try again.")}
              </p>
            ) : inputsDisabled ? (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {t("markModal.offlineNotice", "Connect to the internet to view or add marks")}
              </p>
            ) : isPending ? (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {t("markModal.savedLocally", "Saved on this device")}
              </p>
            ) : null}
          </div>
        ) : null}
        {isWord ? <audio ref={wordAudioRef} preload="none" /> : null}
      </DialogContent>
    </Dialog>
  );
}
