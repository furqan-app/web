import Link from "next/link";
import { BookOpen } from "lucide-react";

export const FurqanLogo = () => (
  <Link
    href="/"
    aria-label="Home"
    className="flex-none size-[34px] rounded-[10px] bg-primary flex items-center justify-center hover:opacity-90 transition-opacity"
  >
    <BookOpen className="size-[15px] text-primary-foreground" strokeWidth={2.2} />
  </Link>
);
