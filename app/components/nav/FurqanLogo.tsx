import Link from "next/link";
import Image from "next/image";

// Gold theme keeps the gold mark; light/dark both use the green mark (matches
// the app's retinted --primary emerald). Pure CSS selection on the .theme-*
// class the app already puts on <html> — no client-side theme state, so no
// SSR/hydration flash and no risk of drifting from the DOM's actual theme
// (useTheme() is per-component local state, not shared — it won't do here).
export const FurqanLogo = () => (
  <Link
    href="/"
    aria-label="Home"
    className="flex-none h-9 w-9 md:h-10 md:w-10 rounded-lg border border-accent-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
  >
    <Image
      src="/icons/logo-navbar-green.png"
      alt=""
      width={34}
      height={34}
      priority
      className="[.theme-gold_&]:hidden"
    />
    <Image
      src="/icons/logo-navbar-gold.png"
      alt=""
      width={34}
      height={34}
      priority
      className="hidden [.theme-gold_&]:block"
    />
  </Link>
);
