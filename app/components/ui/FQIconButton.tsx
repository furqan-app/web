import { ComponentPropsWithoutRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentPropsWithoutRef<typeof Button>, "variant" | "size">;

export const FQIconButton = ({ className, ...props }: Props) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "text-muted-foreground",
        "hover:bg-transparent hover:text-muted-foreground",
        "hover:-translate-y-px active:translate-y-0 active:scale-[.97]",
        "transition-[transform] duration-[120ms]",
        className
      )}
      {...props}
    />
  );
};
