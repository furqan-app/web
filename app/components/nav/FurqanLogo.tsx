import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export const FurqanLogo = ({ className }: Props = {}) => (
  <Link
    href="/"
    aria-label="Home"
    // size-10 (40px) below md to match the other mobile-visible nav icon
    // buttons' footprint (search, overflow trigger — all h-10 w-10); reverts
    // to the tuned 34px at md+ where the row has more items and less need
    // for a uniform touch-target grid (2026-08-13,
    // docs/plans/home-page-design-fixes.md).
    className={cn(
      "fq-icon-chip flex-none size-8 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity",
      className,
    )}
  >
    <Image src="/icons/logo-navbar-white.png" alt="" width={100} height={100} priority />
  </Link>
);
