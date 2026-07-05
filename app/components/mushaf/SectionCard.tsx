import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  // Hero variant adds the manuscript layered inner frame + a touch more padding.
  hero?: boolean;
  className?: string;
};

export const SectionCard = ({
  icon: Icon,
  title,
  description,
  children,
  hero = false,
  className,
}: Props) => {
  return (
    <section
      className={cn(
        "relative bg-card border border-border rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_-16px_rgba(0,0,0,0.14)]",
        hero ? "p-5 md:p-7" : "p-5 md:p-6",
        className,
      )}
    >
      {hero ? (
        <div className="absolute inset-[10px] rounded-xl border border-primary/20 pointer-events-none" />
      ) : null}
      <div className="relative">
        <div className="flex items-start gap-3">
          <span className="flex-none grid place-items-center size-9 rounded-xl bg-primary/10 text-primary">
            <Icon className="size-[18px]" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground leading-tight">
              {title}
            </h2>
            {description ? (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
};
