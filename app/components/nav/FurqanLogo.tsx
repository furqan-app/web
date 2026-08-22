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
      "fq-focus-ring flex-none size-[38px] rounded-full flex items-center justify-center bg-transparent border border-primary/60 hover:border-primary hover:bg-primary/5 transition-colors",
      className,
    )}
  >
    <span className="fq-logo-mark size-[32px] flex-none" aria-hidden="true" />
  </Link>
);
