import { setRequestLocale, getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/options";
import { MyPlansList } from "@/app/components/plans/MyPlansList";
import { PlansSignedOutPrompt } from "@/app/components/plans/PlansSignedOutPrompt";
import { Locale } from "@/app/types/config";

export default async function PlansPage({
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
      {/* Drawn ornament, identity accent — see marks/page.tsx. */}
      <header className="text-center mb-8">
        <div className="flex items-center justify-center gap-4">
          <span className="fq-ornament" aria-hidden="true" />
          <h1 className="font-tajawal font-extrabold text-3xl md:text-4xl text-foreground">
            {t("plans.pageTitle")}
          </h1>
          <span className="fq-ornament fq-ornament--flip" aria-hidden="true" />
        </div>
      </header>

      {session?.user ? (
        <MyPlansList />
      ) : (
        <PlansSignedOutPrompt />
      )}
    </main>
  );
}
