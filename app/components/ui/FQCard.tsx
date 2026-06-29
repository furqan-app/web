import { cn } from "@/lib/utils";

const paddingMap = { sm: "p-2", md: "p-4", lg: "p-6" };

type Props = {
  children: React.ReactNode;
  padding?: "sm" | "md" | "lg";
  className?: string;
};

export const FQCard = ({ children, padding = "md", className }: Props) => {
  return (
    <div
      className={cn(
        "rounded-lg bg-card text-card-foreground border border-border",
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
};
