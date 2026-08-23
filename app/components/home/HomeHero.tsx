import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Props = {
  isRTL: boolean;
};

export const HomeHero = ({ isRTL }: Props) => {
  const t = useTranslations("home");

  return (
    <header className="text-center mb-6 md:mb-7">
      {/* Authentic overline with emerald tone */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="fq-overline text-[11px] font-medium tracking-[0.14em] text-primary">
          {t("overline")}
        </span>
      </div>

      {/* Main title flanked by symmetrical emerald rule marks */}
      <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 mb-2.5">
        <span className="fq-rule-mark shrink-0" aria-hidden="true" />
        <h1 className="font-tajawal font-bold text-2xl sm:text-3xl text-foreground leading-none tracking-tight">
          {t("title")}
        </h1>
        <span className="fq-rule-mark fq-rule-mark--flip shrink-0" aria-hidden="true" />
      </div>

      {/* Subtitle / Tagline */}
      <p
        className={cn(
          "mx-auto text-muted-foreground text-sm sm:text-base leading-relaxed",
          isRTL ? "max-w-2xl" : "max-w-xl",
        )}
      >
        {t("tagline")}
      </p>
    </header>
  );
};
