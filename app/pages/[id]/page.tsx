import Link from "next/link";

import { QuranSafha } from "@/app/components/QuranSafha";
import { fetchPageAPI } from "@/app/hooks/use-quran-page";

// statically generate all pages in build time
export async function generateStaticParams() {
  return Array.from({ length: 604 }, (_, i) => ({
    params: { id: String(i + 1) },
  }));
}

type QuranPageByIdProps = {
  params: { id: string };
};

const QuranPageById = async ({
  params: { id: pageId },
}: QuranPageByIdProps) => {
  const lines = await fetchPageAPI(Number(pageId));
  // const lines = await fetchPageQurancCDN(Number(pageId));

  return (
    <div className="bg:white dark:bg-black w-full min-h-[calc(100vh-3.5rem)] flex justify-center gap-5">
      <div className="flex items-center">
        <Link
          href={`/pages/${pageId === "604" ? "1" : String(Number(pageId) + 1)}`}
          className="text-dark dark:text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m11.25 9-3 3m0 0 3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </Link>
      </div>
      <div className="">
        <QuranSafha page={+pageId} lines={lines} />
      </div>
      <div className="flex items-center">
        <Link
          href={`/pages/${pageId === "1" ? "604" : String(Number(pageId) - 1)}`}
          className="text-dark dark:text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default QuranPageById;

