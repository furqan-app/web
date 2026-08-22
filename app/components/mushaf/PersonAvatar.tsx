type Props = {
  name?: string | null;
};

/** Small circular avatar showing the person's first initial. */
export const PersonAvatar = ({ name }: Props) => {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "؟";

  return (
    <span className="flex-none grid place-items-center size-7 rounded-full border border-border bg-[hsl(var(--well)/var(--well-alpha))] text-[hsl(var(--control-live))] text-sm font-bold">
      {initial}
    </span>
  );
};
