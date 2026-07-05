import { setRequestLocale } from "next-intl/server";

import { ReaderPage } from "@/app/components/reader/ReaderPage";
import { appPrisma } from "@/app/utils/db";
import { Locale } from "@/app/types/config";

// Dynamic per-grant view — deliberately NOT statically generated (unlike the
// self reader). Access is guarded by the parent layout (ADR 0012).
type MushafGrantPageProps = {
  params: { id: string; locale: Locale; grant: string };
};

const MushafGrantPage = async ({
  params: { id: pageId, locale, grant },
}: MushafGrantPageProps) => {
  setRequestLocale(locale);

  // Whose mushaf is being viewed — for the in-header viewing indicator. The
  // parent layout already guarded access; this is just the display name.
  const grantRecord = await appPrisma.mushafAccessGrant.findUnique({
    where: { id: grant },
    select: { owner_user: true },
  });
  const owner = grantRecord
    ? await appPrisma.user.findUnique({
        where: { id: grantRecord.owner_user },
        select: { name: true },
      })
    : null;

  return (
    <ReaderPage
      pageId={pageId}
      locale={locale}
      basePath={`/${locale}/mushaf/${grant}/pages`}
      grantId={grant}
      viewingOwnerName={owner?.name ?? null}
    />
  );
};

export default MushafGrantPage;
