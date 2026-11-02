import {
  Bell,
  CalendarPlus,
  Home,
  UserCog,
  CalendarClock,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  Scissors,
  Settings,
  Sparkles,
  Star,
  Tag,
  UserRound,
  Users,
  ClipboardList,
  Wallet,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/appointments", label: "Appointments", icon: CalendarClock },
      { href: "/admin/payments", label: "Payments", icon: Wallet },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Parlour",
    items: [
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/services", label: "Services", icon: Scissors },
      { href: "/admin/staff", label: "Staff", icon: UserRound },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
      { href: "/admin/offers", label: "Offers", icon: Tag },
    ],
  },
  {
    title: "Academy",
    items: [
      { href: "/admin/courses", label: "Courses", icon: GraduationCap },
      { href: "/admin/enrollments", label: "Enrollments", icon: ClipboardList },
    ],
  },
  {
    title: "Business",
    items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

/** The customer portal (/account) uses the same shell with its own menu. */
export const CUSTOMER_NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "My account",
    items: [
      { href: "/account", label: "Dashboard", icon: LayoutDashboard },
      { href: "/account/book", label: "Book a visit", icon: CalendarPlus },
      { href: "/account/appointments", label: "My appointments", icon: CalendarClock },
      { href: "/account/courses", label: "My courses", icon: GraduationCap },
      { href: "/account/notifications", label: "Notifications", icon: Bell },
      { href: "/account/profile", label: "Profile", icon: UserCog },
    ],
  },
  {
    title: "Explore",
    items: [
      { href: "/services", label: "Services", icon: Scissors },
      { href: "/offers", label: "Offers", icon: Tag },
      { href: "/academy", label: "Academy", icon: Sparkles },
      { href: "/", label: "Website home", icon: Home },
    ],
  },
];

