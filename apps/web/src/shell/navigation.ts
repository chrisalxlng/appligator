import {
  IconBriefcase2,
  IconHome,
  IconInbox,
  IconMail,
  IconUser,
  type Icon,
} from "@tabler/icons-react";
import type { Translations } from "../i18n/en.ts";
import { useMailAccount } from "../mail/mailQueries.ts";

export interface NavigationItem {
  to: "/" | "/jobs" | "/applications" | "/emails" | "/profile";
  labelKey: Exclude<keyof Translations["navigation"], "label">;
  icon: Icon;
}

const navigationItems: NavigationItem[] = [
  { to: "/", labelKey: "home", icon: IconHome },
  { to: "/jobs", labelKey: "jobs", icon: IconBriefcase2 },
  { to: "/applications", labelKey: "applications", icon: IconInbox },
  { to: "/emails", labelKey: "emails", icon: IconMail },
  { to: "/profile", labelKey: "profile", icon: IconUser },
];

export function useNavigationItems() {
  const { data: mailAccount } = useMailAccount();
  return navigationItems.filter(({ to }) => to !== "/emails" || mailAccount);
}
