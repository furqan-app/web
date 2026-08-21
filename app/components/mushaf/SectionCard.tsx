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
        "fq-panel-cast relative bg-card border border-border rounded-[20px]",
        hero ? "p-5 md:p-7" : "p-5 md:p-6",
        className,
      )}
    >
      {hero ? (
        // The layered inner frame is ornament, so it is identity — it was
        // --primary, which spent the state accent on a decoration.
        <div className="absolute inset-[10px] rounded-xl border border-gold/25 pointer-events-none" />
      ) : null}
      <div className="relative">
        <div className="flex items-start gap-3">
          {/* What this section is — identity. */}
          <span className="flex-none grid place-items-center size-9 rounded-xl bg-[hsl(var(--gold)/0.12)] text-gold">
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
