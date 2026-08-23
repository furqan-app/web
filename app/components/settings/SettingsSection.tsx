import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
};

/**
 * One settings section: an identity overline introducing a grouped surface
 * whose rows are hairline-separated. Shared so the sidebar's own blocks, the
 * push toggle, the mushaf-layout picker and the offline section read as one
 * inventory rather than four components' own ideas of a section.
 *
 * Replaces the previous `<h3 class="text-muted-foreground"> + <div class="p-4
 * rounded-lg bg-muted">` pair, which gave every setting its own floating slab.
 */
export const SettingsSection = ({ title, children, className }: Props) => (
  <section>
    <div className="fq-overline">{title}</div>
    <div className={cn("fq-section-group", className)}>{children}</div>
  </section>
);
