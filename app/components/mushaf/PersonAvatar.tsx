type Props = {
  name?: string | null;
};

/** Small circular avatar showing the person's first initial. */
export const PersonAvatar = ({ name }: Props) => {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "؟";

  return (
    <span className="flex-none grid place-items-center size-9 rounded-full bg-accent border border-accent-foreground/20 text-accent-foreground text-sm font-bold">
      {initial}
    </span>
  );
};
