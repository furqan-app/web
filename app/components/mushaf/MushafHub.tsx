"use client";

import { useAccessGrants } from "@hooks/use-access-grants";
import { GenerateCodeCard } from "./GenerateCodeCard";
import { RedeemCodeCard } from "./RedeemCodeCard";
import { AccessibleMushafList } from "./AccessibleMushafList";
import { GrantedViewersList } from "./GrantedViewersList";

export const MushafHub = () => {
  const { data, reload } = useAccessGrants();
  const accessible = data?.accessible ?? [];
  const viewers = data?.viewers ?? [];

  return (
    <div className="flex flex-col gap-5">
      <GenerateCodeCard />
      <RedeemCodeCard onRedeemed={reload} />
      <AccessibleMushafList grants={accessible} />
      <GrantedViewersList grants={viewers} onRevoked={reload} />
    </div>
  );
};
