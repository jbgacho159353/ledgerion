export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/trades", label: "Trades", icon: "📈" },
  { href: "/reports", label: "Reports", icon: "🗓️" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];
