import useTranslations from "@/app/hooks/use-translations";
import { signIn, signOut, useSession } from "next-auth/react";

export const UserMenu = () => {
  const t = useTranslations();
  const { data: session } = useSession();

  if (session?.user?.email) {
    return (
      <div>
        <span className="ml-2 text-white">{session?.user.name}</span>
        <button className="ml-2" onClick={() => signOut()}>
          {t("signOut", "Sign out")}
        </button>
      </div>
    );
  }

  return <button onClick={() => signIn()}>Sign in</button>;
};

