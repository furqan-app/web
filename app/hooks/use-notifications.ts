import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/server/actions/notifications";
import { getQueryClient } from "@/app/utils/queryClient";

/** The caller's in-app feed — polled (no websockets in the base). Disabled entirely when signed out, so the bell doesn't 401-poll for anonymous visitors. */
export const useNotifications = () => {
  const locale = useLocale();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const queryClient = getQueryClient();
  const queryKey = ["/notifications", "list", locale];

  const query = useQuery({
    queryKey,
    queryFn: () => getNotifications({ limit: 20, locale }),
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 60_000 : false,
  });

  const reload = () => queryClient.invalidateQueries({ queryKey: ["/notifications"] });

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: reload,
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: reload,
  });

  return { ...query, reload, markRead, markAllRead };
};
