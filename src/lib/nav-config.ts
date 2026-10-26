import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ShieldCheck,
  Activity,
  Settings,
  User,
  HelpCircle,
  Tag,
  TrendingUp,
  Landmark,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import type { Section } from "@/lib/wealthtrack";

export interface NavSubItem {
  id: string;
  label: string;
  h1: string;
  path: string;
  icon: LucideIcon;
}

export interface NavItem {
  id: string;
  section: Section;
  label: string;
  h1: string;
  breadcrumb: string;
  path: string;
  icon: LucideIcon;
  subItems?: NavSubItem[];
  inBottomNav?: boolean;
  inDrawer?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "home",
    section: "Overview",
    label: "Home",
    h1: "Home",
    breadcrumb: "Home",
    path: "/",
    icon: LayoutDashboard,
    inBottomNav: true,
    inDrawer: true,
  },
  {
    id: "transactions",
    section: "Transactions",
    label: "Transactions",
    h1: "Transactions",
    breadcrumb: "Transactions",
    path: "/transactions",
    icon: ArrowLeftRight,
    inBottomNav: true,
    inDrawer: true,
  },
  {
    id: "wealth",
    section: "Wealth",
    label: "Wealth",
    h1: "Wealth",
    breadcrumb: "Wealth",
    path: "/wealth",
    icon: Wallet,
    inBottomNav: true,
    inDrawer: true,
    subItems: [
      { id: "accounts", label: "Accounts", h1: "Accounts", path: "/accounts", icon: Wallet },
      { id: "investments", label: "Investments", h1: "Investments", path: "/investments", icon: TrendingUp },
      { id: "loans", label: "Loans", h1: "Loans", path: "/loans", icon: Landmark },
    ],
  },
  {
    id: "plan",
    section: "Plan",
    label: "Plan",
    h1: "Plan",
    breadcrumb: "Plan",
    path: "/plan",
    icon: ShieldCheck,
    inBottomNav: true,
    inDrawer: true,
    subItems: [
      { id: "budgets", label: "Budgets", h1: "Budgets", path: "/categories", icon: Tag },
      { id: "goals", label: "Goals", h1: "Goals", path: "/funds", icon: ShieldCheck },
      { id: "recurring", label: "Recurring", h1: "Recurring", path: "/recurring", icon: CalendarDays },
    ],
  },
  {
    id: "insights",
    section: "Reports",
    label: "Insights",
    h1: "Insights",
    breadcrumb: "Insights",
    path: "/reports",
    icon: Activity,
    inBottomNav: false,
    inDrawer: true,
  },
];

export const SECONDARY_NAV_ITEMS: NavItem[] = [
  {
    id: "preferences",
    section: "Preferences",
    label: "Preferences",
    h1: "Preferences",
    breadcrumb: "Preferences",
    path: "/preferences",
    icon: Settings,
    inDrawer: true,
  },
  {
    id: "profile",
    section: "Profile",
    label: "Profile",
    h1: "Profile",
    breadcrumb: "Profile",
    path: "/profile",
    icon: User,
    inDrawer: true,
  },
  {
    id: "help",
    section: "Help",
    label: "Help",
    h1: "Help & Support",
    breadcrumb: "Help",
    path: "/help",
    icon: HelpCircle,
    inDrawer: true,
  },
];

export function getNavItemBySection(section: Section): NavItem | undefined {
  return (
    NAV_ITEMS.find((item) => item.section === section) ||
    SECONDARY_NAV_ITEMS.find((item) => item.section === section)
  );
}

export function getBreadcrumbForSection(section: Section): string {
  const item = getNavItemBySection(section);
  return item ? item.breadcrumb : String(section);
}

export function getH1ForSection(section: Section): string {
  const item = getNavItemBySection(section);
  return item ? item.h1 : String(section);
}
