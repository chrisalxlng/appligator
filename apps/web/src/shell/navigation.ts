import { IconBriefcase2, IconHome, IconInbox, IconUser, type Icon } from "@tabler/icons-react";

export interface NavigationItem {
  to: "/" | "/jobs" | "/applications" | "/profile";
  label: string;
  icon: Icon;
}

export const navigationItems: NavigationItem[] = [
  { to: "/", label: "Home", icon: IconHome },
  { to: "/jobs", label: "Stellen", icon: IconBriefcase2 },
  { to: "/applications", label: "Bewerbungen", icon: IconInbox },
  { to: "/profile", label: "Profil", icon: IconUser },
];
