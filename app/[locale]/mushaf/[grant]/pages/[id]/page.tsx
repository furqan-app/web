import { setRequestLocale } from "next-intl/server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/options";
import { ReaderPage } from "@/app/components/reader/ReaderPage";
import { appPrisma } from "@/app/utils/db";
import { Locale } from "@/app/types/config";

// Dynamic per-grant view — deliberately NOT statically generated (unlike the
// self reader). Access is guarded by both layout and page (ADR 0012).
type MushafGrantPageProps = {
  params: { id: string; locale: Locale; grant: string };
};

const MushafGrantPage = async ({
  params: { id: pageId, locale, grant },
}: MushafGrantPageProps) => {
  setRequestLocale(locale);

  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as { id?: number } | undefined)?.id;

  if (!viewerId) {
    redirect(`/${locale}`);
  }

  // Guard access on every page request (essential for client-side Next.js child transitions)
  const grantRecord = await appPrisma.mushafAccessGrant.findUnique({
    where: { id: grant },
    select: { owner_user: true, viewer_user: true },
  });

  if (!grantRecord || grantRecord.viewer_user !== viewerId) {
    redirect(`/${locale}/mushaf?removed=1`);
  }

  const owner = await appPrisma.user.findUnique({
    where: { id: grantRecord.owner_user },
    select: { name: true },
  });

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
