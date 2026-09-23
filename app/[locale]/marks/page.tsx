import { setRequestLocale, getTranslations } from "next-intl/server";

import { MyMarksList } from "@/app/components/marks/MyMarksList";
import { Locale } from "@/app/types/config";

export default async function MarksPage({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  setRequestLocale(locale);

  const t = await getTranslations();

  return (
    <main className="container mx-auto px-4 py-8 md:py-10 max-w-2xl min-h-[calc(100dvh-3.5rem)]">
      {/* Drawn ornament, identity accent. The `◆` glyphs this replaces read as
          footnote markers and sat on --primary, the state accent. */}
      <header className="text-center mb-8">
        <div className="flex items-center justify-center gap-4">
          <span className="fq-rule-mark" aria-hidden="true" />
          <h1 className="font-tajawal font-extrabold text-3xl md:text-4xl text-foreground">
            {t("marks.pageTitle")}
          </h1>
          <span className="fq-rule-mark fq-rule-mark--flip" aria-hidden="true" />
        </div>
      </header>

      {/* No server session seed (ADR 0014 Addendum 10, #591): this route is a
          static precached shell, so per-request session HTML must never bake
          into it. MyMarksList resolves the live session client-side. */}
      <MyMarksList />
    </main>
  );
}
