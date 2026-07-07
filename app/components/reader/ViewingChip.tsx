"use client";

import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  ownerName?: string | null;
};

/**
 * "You're viewing someone else's mushaf" indicator, rendered inline in the safha
 * header start cell (see ADR 0012). Deliberately a single static pulsing eye —
 * not expandable and with no label/exit — so it never shifts the header layout
 * or covers page content. The owner name is surfaced via title/aria-label only;
 * when it's unknown (null/empty) a generic label is used so the eye still shows.
 *
 * The eye does a single quick dip per 3s cycle (the `flicker` keyframe), disabled
 * under prefers-reduced-motion.
 */
export const ViewingChip = ({ ownerName }: Props) => {
  const t = useTranslations("mushaf");
  const label = ownerName
    ? t("viewingChip", { name: ownerName })
    : t("viewingChipGeneric");

  return (
    <span
      className="grid size-4 flex-none place-items-center text-primary"
      title={label}
      aria-label={label}
      role="img"
    >
      <Eye
        className="size-3 animate-flicker motion-reduce:animate-none"
        strokeWidth={1.8}
      />
    </span>
  );
};
