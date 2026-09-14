import { setRequestLocale, getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/options";
import { MyPlansList } from "@/app/components/plans/MyPlansList";
import { PlansSignedOutPrompt } from "@/app/components/plans/PlansSignedOutPrompt";
import { AddPlanButton } from "@/app/components/plans/AddPlanButton";
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
      {/* Page Header: Title on start side + promoted AddPlanButton on end side */}
      <header className="mb-6 md:mb-8 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="fq-rule-mark hidden sm:inline-block" aria-hidden="true" />
          <h1 className="font-tajawal font-extrabold text-2xl md:text-3xl text-foreground">
            {t("plans.pageTitle")}
          </h1>
          <span className="fq-rule-mark fq-rule-mark--flip hidden sm:inline-block" aria-hidden="true" />
        </div>

        {session?.user ? (
          <AddPlanButton variant="header" />
        ) : null}
      </header>

      {session?.user ? (
        <MyPlansList />
      ) : (
        <PlansSignedOutPrompt />
      )}
    </main>
  );
}
