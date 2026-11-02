import { Navigate } from "@tanstack/react-router";
import { useIsWide } from "../shell/useMediaQuery.ts";
import { useMailMessages } from "./mailQueries.ts";

export function InboxIndex() {
  const isWide = useIsWide();
  const firstMessageId = useMailMessages().data?.[0]?.id;

  if (!isWide || !firstMessageId) return null;
  return <Navigate to="/inbox/$messageId" params={{ messageId: firstMessageId }} replace />;
}
