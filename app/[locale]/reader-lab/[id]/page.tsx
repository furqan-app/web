import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { ReaderLabPage } from "@/app/components/reader-lab/ReaderLabPage";
import { Locale } from "@/app/types/config";

// Bounds Hostinger CDN edge-cache poisoning to a 5-minute window (see ADR 0035).
export const revalidate = 300;

export async function generateStaticParams() {
  return Array.from({ length: 604 }, (_, i) => ({
    id: String(i + 1),
  }));
}

type ReaderLabRouteProps = {
  params: { id: string; locale: Locale };
};

const ReaderLabRoute = async ({
  params: { id: pageId, locale },
}: ReaderLabRouteProps) => {
  if (locale !== "ar") {
    notFound();
  }

  const pageNumber = Number(pageId);
  if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > 604) {
    notFound();
  }

  setRequestLocale(locale);

  return <ReaderLabPage pageId={pageId} locale={locale} />;
};

export default ReaderLabRoute;
