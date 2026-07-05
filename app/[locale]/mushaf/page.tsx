import { setRequestLocale, getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/options";
import { MushafHub } from "@/app/components/mushaf/MushafHub";
import { SignedOutPrompt } from "@/app/components/mushaf/SignedOutPrompt";
import { AccessRemovedBanner } from "@/app/components/mushaf/AccessRemovedBanner";
import { Locale } from "@/app/types/config";

export default async function MushafHubPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: { removed?: string };
}) {
  setRequestLocale(locale);

  const [session, t] = await Promise.all([
    getServerSession(authOptions),
    getTranslations(),
  ]);

  return (
    <main className="container mx-auto px-4 py-8 md:py-10 max-w-2xl min-h-[calc(100dvh-3.5rem)]">
      <header className="text-center mb-8">
        <div className="flex items-center justify-center gap-2.5">
          <span className="inline-block rotate-45 text-[8px] text-primary">
            ◆
          </span>
          <h1 className="font-tajawal font-extrabold text-3xl md:text-4xl text-foreground">
            {t("mushaf.hubTitle")}
          </h1>
          <span className="inline-block rotate-45 text-[8px] text-primary">
            ◆
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
          {t("mushaf.hubTagline")}
        </p>
      </header>

      {session?.user ? (
        <div className="flex flex-col gap-5">
          {searchParams?.removed ? <AccessRemovedBanner /> : null}
          <MushafHub />
        </div>
      ) : (
        <SignedOutPrompt />
      )}
    </main>
  );
}
