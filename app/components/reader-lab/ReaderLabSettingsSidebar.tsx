"use client";

import { Check, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import useTranslations from "@/app/hooks/use-translations";
import { useCloseOnBackGesture } from "@/app/hooks/use-close-on-back-gesture";
import { cn } from "@/lib/utils";

type ReaderLabSettingsSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The sheet has no SheetTrigger (it is opened from shell state), so Radix has
  // nothing to hand focus back to on close. The shell supplies the target.
  onRestoreFocus?: () => void;
};

// A settings row states its current value; it never offers a way to change it.
// Production's interactive controls are deliberately not mounted here — this is
// an inventory for evaluating the composition, not a second settings surface.
function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fq-reader-lab-settings-row">
      <div className="min-w-0">
        <div className="text-[13px] font-medium leading-tight text-[hsl(var(--rl-text))]">
          {label}
        </div>
        {hint ? (
          <div className="mt-0.5 text-[11px] leading-tight text-[hsl(var(--rl-muted))]">
            {hint}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="fq-reader-lab-overline">{title}</h3>
      <div className="fq-reader-lab-settings-group">{children}</div>
    </section>
  );
}

// An inert switch: it pictures a stored state, so it is decorative, not a
// control. Kept out of the tab order and hidden from assistive tech — the row
// label carries the same information in text.
function StateSwitch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-[18px] w-8 items-center rounded-full p-0.5 transition-colors",
        on
          ? "justify-end bg-[hsl(var(--rl-emerald-dim))] ring-1 ring-inset ring-[hsl(var(--rl-emerald)/0.45)]"
          : "justify-start bg-[hsl(var(--rl-surface-raised))] ring-1 ring-inset ring-[hsl(var(--rl-line-soft))]",
      )}
    >
      <span
        className={cn(
          "size-3.5 rounded-full",
          on ? "bg-[hsl(var(--rl-emerald))]" : "bg-[hsl(var(--rl-muted)/0.6)]",
        )}
      />
    </span>
  );
}

// Three graded marks — the reading-size scale pictured rather than offered as
// three buttons that look pressable but do nothing.
function ScaleMarks({ active }: { active: 0 | 1 | 2 }) {
  return (
    <span aria-hidden="true" className="flex items-end gap-[3px]">
      {[5, 8, 11].map((h, i) => (
        <span
          key={h}
          style={{ height: `${h}px` }}
          className={cn(
            "w-[3px] rounded-full",
            i === active
              ? "bg-[hsl(var(--rl-gold))]"
              : "bg-[hsl(var(--rl-line))]",
          )}
        />
      ))}
    </span>
  );
}

export function ReaderLabSettingsSidebar({
  open,
  onOpenChange,
  onRestoreFocus,
}: ReaderLabSettingsSidebarProps) {
  const t = useTranslations();
  useCloseOnBackGesture(open, () => onOpenChange(false));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        dir="rtl"
        hideDefaultClose
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus?.();
        }}
        overlayClassName="bg-[hsl(var(--rl-void)/0.64)] backdrop-blur-[2px]"
        // The portalled element sits outside .fq-reader-lab, so it declares the
        // lab tokens itself via .fq-reader-lab-settings.
        className="fq-reader-lab-settings sm:max-w-[408px] w-full gap-0 border-0 bg-[hsl(var(--rl-stage))] p-0 text-[hsl(var(--rl-text))] shadow-[0_24px_64px_hsl(211_39%_2%/0.45)]"
      >
        <div className="flex h-full flex-col">
          <header className="relative shrink-0 px-5 pb-4 pt-5 pe-16">
            <p className="fq-reader-lab-overline !mx-0 !mb-2">
              {t("readerLab.badge", "مختبر القراءة")}
            </p>
            <SheetTitle className="text-base font-semibold leading-none text-[hsl(var(--rl-text))]">
              {t("settings", "الإعدادات")}
            </SheetTitle>
            <SheetDescription className="mt-1.5 text-[12px] leading-relaxed text-[hsl(var(--rl-muted))]">
              {t(
                "readerLab.presentationOnly",
                "لوحة عرض: كل خيار هنا يُظهر حالته الحالية فقط، ولا يغيّر شيئاً في التطبيق.",
              )}
            </SheetDescription>
            <SheetClose
              aria-label={t("readerLab.close", "إغلاق")}
              className="fq-reader-lab-btn-lead absolute end-4 top-5"
            >
              <X className="size-4" strokeWidth={1.8} />
            </SheetClose>
            <span
              aria-hidden="true"
              className="absolute inset-x-5 bottom-0 h-px bg-[hsl(var(--rl-line-soft))]"
            />
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <Section title={t("readerLab.sectionReading", "القراءة")}>
              <Row label={t("language", "اللغة")}>
                <span className="fq-reader-lab-value">
                  {t("readerLab.categoryLanguage", "العربية (الافتراضية)")}
                </span>
              </Row>
              <Row label={t("quranFontSize", "حجم الخط")}>
                <ScaleMarks active={1} />
                <span className="fq-reader-lab-value">
                  {t("readerLab.categoryFontSize", "متوسط (٢٨)")}
                </span>
              </Row>
              <Row label={t("pageView", "عرض الصفحة")}>
                <span className="fq-reader-lab-value">
                  {t("readerLab.categoryPageView", "صفحتان متقابلتان")}
                </span>
                <span className="fq-reader-lab-chip" data-tone="live">
                  {t("readerLab.stateLocked", "مثبت")}
                </span>
              </Row>
              <Row
                label={t("mushafLayout.title", "تخطيط المصحف")}
                hint={t(
                  "readerLab.categoryMushafLayout",
                  "مصحف مجمع الملك فهد (طبعة ١٤٠٥هـ)",
                )}
              >
                <span className="fq-reader-lab-chip">
                  {t("mushafLayout.active", "نشط")}
                </span>
              </Row>
            </Section>

            <Section title={t("appearance", "المظهر")}>
              {/* The only natively disabled control in the panel: the lab is
                  dark-only, so there is no second option to show. */}
              <div className="fq-reader-lab-settings-row">
                <label className="flex min-w-0 items-center gap-2.5">
                  <input
                    type="radio"
                    checked
                    disabled
                    readOnly
                    name="fq-reader-lab-theme"
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="grid size-[18px] place-items-center rounded-full bg-[hsl(var(--rl-emerald))] text-[hsl(var(--rl-stage))]"
                  >
                    <Check className="size-3 stroke-[3]" />
                  </span>
                  <span className="text-[13px] font-medium text-[hsl(var(--rl-text))]">
                    {t("theme.dark", "داكن")}
                  </span>
                </label>
                <span className="text-[11px] text-[hsl(var(--rl-muted))]">
                  {t("readerLab.appearanceDarkOnly", "هذه التجربة مظلمة فقط")}
                </span>
              </div>
            </Section>

            <Section title={t("readerLab.sectionDevice", "الجهاز والتلاوة")}>
              <Row
                label={t("keepScreenAwakeLabel", "إبقاء الشاشة مضاءة")}
                hint={t("readerLab.categoryKeepScreenAwake", "مفعل تلقائياً")}
              >
                <StateSwitch on />
              </Row>
              <Row
                label={t("notifications.settings.enablePush", "إشعارات الدفع")}
                hint={t("readerLab.categoryNotifications", "غير مفعلة")}
              >
                <StateSwitch on={false} />
              </Row>
              <Row
                label={t("offlineRecitation.title", "التلاوة دون اتصال")}
                hint={t("readerLab.categoryOfflineRecitation", "جاهز للاستماع")}
              >
                <span className="fq-reader-lab-chip">
                  {t("readerLab.stateOnline", "عبر الإنترنت")}
                </span>
              </Row>
            </Section>

            {/* Closes the inventory so the panel resolves instead of trailing
                off into empty desk. */}
            <div className="flex justify-center pt-1">
              <span className="fq-reader-lab-close-mark" aria-hidden="true" />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
