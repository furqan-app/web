import { setRequestLocale, getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/options";
import { QuranHeartMapTab } from "@/app/components/plans/QuranHeartMapTab";
import { PlansSignedOutPrompt } from "@/app/components/plans/PlansSignedOutPrompt";
import { Locale } from "@/app/types/config";

export default async function HeartPage({
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
    <main className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 md:py-5 max-w-6xl min-h-[calc(100dvh-3.5rem)] flex flex-col justify-start">
      <header className="text-center mb-3 sm:mb-4">
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <span className="fq-rule-mark" aria-hidden="true" />
          <h1 className="font-tajawal font-extrabold text-2xl md:text-3xl text-foreground">
            {t("heart.pageTitle")}
          </h1>
          <span className="fq-rule-mark fq-rule-mark--flip" aria-hidden="true" />
        </div>
      </header>

      {session?.user ? (
        <QuranHeartMapTab />
      ) : (
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <PlansSignedOutPrompt
            descriptionKey="heart.signedOut"
            defaultDescription="Sign in to track your Quran memorization through My Quranic Heart map."
          />
        </div>
      )}
    </main>
  );
}
