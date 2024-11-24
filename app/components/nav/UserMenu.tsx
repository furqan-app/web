import { signIn, signOut, useSession } from "next-auth/react";

export const UserMenu = () => {
  const { data: session } = useSession();

  if (session) {
    return (
      <div>
        <span className="ml-2">{session?.user?.name}</span>
        <button className="ml-2" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return <button onClick={() => signIn()}>Sign in</button>;
};

