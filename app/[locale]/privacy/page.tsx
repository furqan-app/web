import { setRequestLocale, getTranslations } from "next-intl/server";

import { Locale } from "@/app/types/config";

// Contact address shown in the policy (deletion requests, questions). Must be
// a monitored mailbox and match the Play Console contact details.
// Temporary address until the official support mailbox exists.
const SUPPORT_EMAIL = "taha.mohamed4213@gmail.com";

const SECTIONS = [
  { title: "s1t", body: "s1b" },
  { title: "s2t", body: "s2b" },
  { title: "s3t", body: "s3b" },
  { title: "s4t", body: "s4b" },
  { title: "s5t", body: "s5b" },
  { title: "s7t", body: "s7b" },
] as const;

// Static public document (also serves as the Play Console privacy-policy URL).
// No session, no user data — safe to pre-render for both locales.
export default async function PrivacyPage({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  setRequestLocale(locale);

  const t = await getTranslations("privacy");

  return (
    <main className="container mx-auto px-4 py-8 md:py-10 max-w-2xl min-h-[calc(100dvh-3.5rem)]">
      <header className="text-center mb-8">
        <div className="flex items-center justify-center gap-4">
          <span className="fq-rule-mark" aria-hidden="true" />
          <h1 className="font-tajawal font-extrabold text-3xl md:text-4xl text-foreground">
            {t("title")}
          </h1>
          <span className="fq-rule-mark fq-rule-mark--flip" aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t("updated")}</p>
      </header>

      <p className="mb-8 text-foreground leading-8">{t("intro")}</p>

      {SECTIONS.map(({ title, body }) => (
        <section key={title} className="mb-6">
          <h2 className="font-tajawal font-bold text-xl text-foreground mb-2">
            {t(title)}
          </h2>
          <p className="text-foreground leading-8">{t(body)}</p>
        </section>
      ))}

      <section className="mb-6">
        <h2 className="font-tajawal font-bold text-xl text-foreground mb-2">
          {t("s8t")}
        </h2>
        <p className="text-foreground leading-8">
          {t("s8b", { email: SUPPORT_EMAIL })}
        </p>
      </section>
    </main>
  );
}
