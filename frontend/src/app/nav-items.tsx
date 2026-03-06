import { Bookmark, Brackets, List, Settings, Timer } from "lucide-react";

export const navTitle = "ihpp";

export const defaultNavItem = "proxies";

export const navItems = [
  {
    id: "proxies" as const,
    icon: Brackets,
    label: "Proxy Servers",
    path: "/proxies",
  },
  {
    id: "history" as const,
    icon: Timer,
    label: "History Traffic",
    path: "/history",
    position: "bottom",
  },
  {
    id: "saved" as const,
    icon: Bookmark,
    label: "Saved Traffic",
    path: "/saved",
    position: "bottom",
  },
  {
    id: "settings" as const,
    icon: Settings,
    label: "System Settings",
    path: "/settings",
    position: "bottom",
  },
];
