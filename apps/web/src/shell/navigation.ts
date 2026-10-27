import { IconBriefcase2, IconHome, IconInbox, IconUser, type Icon } from "@tabler/icons-react";
import type { Translations } from "../i18n/en.ts";

export interface NavigationItem {
  to: "/" | "/jobs" | "/applications" | "/profile";
  labelKey: Exclude<keyof Translations["navigation"], "label">;
  icon: Icon;
}

export const navigationItems: NavigationItem[] = [
  { to: "/", labelKey: "home", icon: IconHome },
  { to: "/jobs", labelKey: "jobs", icon: IconBriefcase2 },
  { to: "/applications", labelKey: "applications", icon: IconInbox },
  { to: "/profile", labelKey: "profile", icon: IconUser },
];
