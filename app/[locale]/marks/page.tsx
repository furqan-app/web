import { setRequestLocale, getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/options";
import { MyMarksList } from "@/app/components/marks/MyMarksList";
import { Locale } from "@/app/types/config";

export default async function MarksPage({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  setRequestLocale(locale);

  const [session, t] = await Promise.all([
    getServerSession(authOptions),
    getTranslations(),
  ]);

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

      <MyMarksList initialSessionUser={session?.user} />
    </main>
  );
}
