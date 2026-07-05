import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { setRequestLocale } from "next-intl/server";

import { authOptions } from "@/app/api/auth/options";
import { appPrisma } from "@/app/utils/db";
import { getSurahs } from "@/app/hooks/get-surahs";
import { getRubs } from "@/app/hooks/get-rubs";
import { Locale } from "@/app/types/config";

const Sidebar = dynamic(() => import("@/app/components/nav/Sidebar"));

export default async function MushafGrantLayout({
  children,
  params: { locale, grant },
}: {
  children: React.ReactNode;
  params: { locale: Locale; grant: string };
}) {
  setRequestLocale(locale);

  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as { id?: number } | undefined)?.id;

  // Not signed in (e.g. logged out while on this page) → send home rather than
  // 404. A full-load redirect re-applies the theme; a bare notFound() here would
  // render the root 404 (outside the locale layout) and drop the theme colors.
  if (!viewerId) {
    redirect(`/${locale}`);
  }

  const grantRecord = await appPrisma.mushafAccessGrant.findUnique({
    where: { id: grant },
  });

  // Signed in but not this grant's viewer (or the grant is gone) → a genuine
  // 404. The grant id is not a capability — only its viewer may open it (ADR 0012).
  if (!grantRecord || grantRecord.viewer_user !== viewerId) {
    notFound();
  }

  const [surahs, rubs] = await Promise.all([getSurahs(), getRubs()]);

  return (
    <>
      <Sidebar surahs={surahs} rubs={rubs} />
      {children}
    </>
  );
}
