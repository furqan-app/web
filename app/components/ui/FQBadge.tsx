import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  variant?: "default" | "primary";
  className?: string;
};

export const FQBadge = ({ children, variant = "default", className }: Props) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center w-12 h-12 rounded-full",
        variant === "default" && "border text-foreground bg-gold-tint border-gold-soft",
        variant === "primary" && "border border-primary bg-primary text-primary-foreground",
        className
      )}
    >
      {children}
    </div>
  );
};
