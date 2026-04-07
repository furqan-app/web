import dynamic from "next/dynamic";
import { setRequestLocale } from "next-intl/server";
import { getSurahs } from "@/app/hooks/get-surahs";
import { getRubs } from "@/app/hooks/get-rubs";
import { Locale } from "@/app/types/config";

const Sidebar = dynamic(() => import("@/app/components/nav/Sidebar"));

export default async function PagesLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  setRequestLocale(locale);

  const [surahs, rubs] = await Promise.all([getSurahs(), getRubs()]);

  return (
    <>
      <Sidebar surahs={surahs} rubs={rubs} />
      {children}
    </>
  );
}
