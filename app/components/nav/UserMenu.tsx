import { signIn, signOut, useSession } from "next-auth/react";
import { User, LogIn, LogOut } from "lucide-react";
import { FQIconButton } from "@/app/components/ui/FQIconButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const UserMenu = () => {
  const { data: session } = useSession();

  if (session) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <FQIconButton>
            <User className="size-5" />
          </FQIconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="font-medium">
            {session?.user?.name}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <FQIconButton onClick={() => signIn()}>
      <LogIn className="size-5" />
    </FQIconButton>
  );
};
