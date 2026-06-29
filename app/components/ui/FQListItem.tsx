import { Link } from "@/i18n/routing";

type Props = {
  href: string;
  locale: string;
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
};

export const FQListItem = ({ href, locale, leading, title, subtitle }: Props) => {
  return (
    <Link
      locale={locale}
      href={href}
      className="flex gap-4 items-center p-4 border-b border-border last:border-none hover:bg-card-2 transition-[background] duration-[180ms]"
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="flex-1">
        {title}
        {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
      </div>
    </Link>
  );
};
