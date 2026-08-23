import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export const FurqanLogo = ({ className }: Props = {}) => (
  <Link
    href="/"
    aria-label="Home"
    className={cn(
      "fq-focus-ring flex-none rounded-full size-[35px] flex items-center justify-center bg-transparent transition-colors",
      className,
    )}
  >
    <span className="fq-logo-mark size-[150%] flex-none" aria-hidden="true" />
  </Link>
);
