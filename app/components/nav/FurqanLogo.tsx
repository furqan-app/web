import Link from "next/link";
import Image from "next/image";

export const FurqanLogo = () => (
  <Link
    href="/"
    aria-label="Home"
    className="flex-none size-[34px] rounded-[10px] bg-primary flex items-center justify-center hover:opacity-90 transition-opacity"
  >
    <Image src="/icons/logo-navbar-white.png" alt="" width={32} height={32} priority />
  </Link>
);
