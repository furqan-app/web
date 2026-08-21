"use client";

import Image from "next/image";
import { Search, Bookmark, Bell, Settings } from "lucide-react";

import { useReaderPage } from "@/app/contexts/ReaderPageContext";
import { usePage } from "@/app/hooks/use-quran-page";
import useTranslations from "@/app/hooks/use-translations";
import { toLocaleNumeral } from "@/app/utils/i18n";

type ReaderLabNavbarProps = {
  initialPage: number;
  gearRef?: React.Ref<HTMLButtonElement>;
  onOpenSettings: () => void;
};

// The three inert navbar affordances. They are focusable and named so the
// design can be inspected with a keyboard and a screen reader, but they carry
// no handler — nothing in this route may act.
const STATIC_ACTIONS = [
  { key: "search", Icon: Search, tooltip: "readerLab.searchTooltip" },
  { key: "bookmark", Icon: Bookmark, tooltip: "readerLab.bookmarkTooltip" },
  { key: "notifications", Icon: Bell, tooltip: "readerLab.notificationsTooltip" },
] as const;

export function ReaderLabNavbar({
  initialPage,
  gearRef,
  onOpenSettings,
}: ReaderLabNavbarProps) {
  const t = useTranslations();
  const { visiblePages } = useReaderPage();
  const activePage = visiblePages?.[0] ?? initialPage;
  const { data } = usePage(activePage);

  const metadata = data?.pageMetadata;
  const surahName = metadata?.chapter?.name_arabic;
  const juzNumber = metadata?.juz_number;
  const hizbNumber = metadata?.hizb_number;

  return (
    <header
      dir="rtl"
      // Height and padding are band values in globals.css; the chrome loses
      // information as the viewport narrows, never type size.
      className="fq-reader-lab-navbar fixed top-0 inset-x-0 z-30 flex items-center justify-between select-none"
    >
      {/* Physical right (start in RTL) — identity and orientation only. */}
      <div className="fq-reader-lab-nav-lead flex items-center gap-3 min-w-0">
        <span className="fq-reader-lab-mark grid place-items-center">
          <Image
            src="/icons/logo-navbar-white.png"
            alt=""
            width={24}
            height={24}
            className="size-[18px] object-contain opacity-90"
            priority
          />
        </span>
        <span className="fq-reader-lab-nav-wordmark text-[19px] font-bold leading-none text-[hsl(var(--rl-text))]">
          {t("readerLab.title", "فرقان")}
        </span>
        <span className="fq-reader-lab-nav-badge h-4 w-px bg-[hsl(var(--rl-line-soft))]" aria-hidden="true" />
        <span className="fq-reader-lab-nav-badge text-[11px] font-medium tracking-[0.06em] text-[hsl(var(--rl-gold)/0.85)] whitespace-nowrap">
          {t("readerLab.badge", "مختبر القراءة")}
        </span>
      </div>

      {/* Centre — the page's own metadata, framed by drawn ornament. */}
      <div className="fq-reader-lab-nav-centre flex items-center gap-4 min-w-0">
        <span className="fq-reader-lab-ornament" aria-hidden="true" />
        <div className="flex flex-col items-center gap-1">
          <span className="fq-reader-lab-nav-surah truncate text-[20px] font-semibold leading-none text-[hsl(var(--rl-text))]">
            {surahName
              ? `${t("surah", "سورة")} ${surahName}`
              : t("readerLab.metadataPlaceholder", "بيانات الصفحة…")}
          </span>
          {juzNumber && hizbNumber ? (
            <span className="fq-reader-lab-nav-orient text-[11px] font-medium leading-none tracking-[0.08em] text-[hsl(var(--rl-muted))]">
              {t("juz", "جزء")}{" "}
              <span className="text-[hsl(var(--rl-gold))]">
                {toLocaleNumeral(juzNumber, "ar")}
              </span>
              <span className="mx-1.5 text-[hsl(var(--rl-line))]">•</span>
              {t("hizb", "الحزب")}{" "}
              <span className="text-[hsl(var(--rl-gold))]">
                {toLocaleNumeral(hizbNumber, "ar")}
              </span>
            </span>
          ) : (
            <span
              className="fq-reader-lab-nav-orient h-px w-10 bg-[hsl(var(--rl-line-soft))]"
              aria-hidden="true"
            />
          )}
        </div>
        <span
          className="fq-reader-lab-ornament fq-reader-lab-ornament--flip"
          aria-hidden="true"
        />
      </div>

      {/* Physical left (end in RTL) — inert cluster, then the one live control. */}
      <div className="fq-reader-lab-nav-trail flex items-center">
        <div className="fq-reader-lab-well">
          {STATIC_ACTIONS.map(({ key, Icon, tooltip }) => {
            const label = t(tooltip, "");
            return (
              <button
                key={key}
                type="button"
                aria-disabled="true"
                title={label}
                aria-label={label}
                className="fq-reader-lab-btn"
              >
                <Icon className="size-4" strokeWidth={1.8} />
              </button>
            );
          })}
        </div>
        <span
          className="fq-reader-lab-nav-divider mx-3 h-5 w-px bg-[hsl(var(--rl-line-soft))]"
          aria-hidden="true"
        />
        <button
          ref={gearRef}
          type="button"
          onClick={onOpenSettings}
          title={t("readerLab.settingsTooltip", "الإعدادات")}
          aria-label={t("readerLab.settingsTooltip", "الإعدادات")}
          className="fq-reader-lab-btn-lead"
        >
          <Settings className="size-[18px]" strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
