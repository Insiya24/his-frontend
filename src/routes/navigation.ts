import type { ComponentType, SVGProps } from "react";
import type { Role } from "@/types/auth";
import {
  IconAlertTriangle,
  IconBarChart,
  IconBuilding,
  IconCalendarCheck,
  IconClipboardCheck,
  IconDashboard,
  IconFileText,
  IconMessageSquare,
  IconPackage,
  IconShield,
  IconStar,
  IconTruck,
  IconUser,
  IconUsers,
} from "@/components/icons";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export interface NavSection {
  heading?: string;
  items: NavItem[];
}

export function buildNavigation(scope: "admin" | "manager"): NavSection[] {
  const p = (path: string) => `/${scope}/${path}`;
  const sections: NavSection[] = [
    {
      items: [{ to: p("dashboard"), label: "Dashboard", icon: IconDashboard }],
    },
    ...(scope === "admin"
      ? [
          {
            heading: "Management",
            items: [
              { to: p("users"), label: "Users", icon: IconUsers },
              { to: p("branches"), label: "Branches", icon: IconBuilding },
            ] as NavItem[],
          },
        ]
      : []),
    {
      heading: "Operations",
      items: [
        { to: p("attendance"), label: "Attendance", icon: IconCalendarCheck },
        { to: p("cleaning"), label: "Cleaning", icon: IconClipboardCheck },
        { to: p("inventory"), label: "Inventory", icon: IconPackage },
        { to: p("product-requests"), label: "Product Requests", icon: IconTruck },
        { to: p("complaints"), label: "Complaints", icon: IconMessageSquare },
        { to: p("inspections"), label: "Inspections", icon: IconShield },
        { to: p("special-remarks"), label: "Special Remarks", icon: IconFileText },
      ],
    },
    {
      heading: "People",
      items: [
        { to: p("staff"), label: "Staff", icon: IconUser },
        { to: p("customers"), label: "Customers", icon: IconUsers },
        { to: p("reviews"), label: "Reviews", icon: IconStar },
      ],
    },
    {
      heading: "Reports",
      items: [
        { to: p("reports"), label: "Reports", icon: IconBarChart },
        ...(scope === "admin"
          ? ([{ to: p("audit"), label: "Audit Logs", icon: IconAlertTriangle }] as NavItem[])
          : []),
      ],
    },
  ];
  return sections;
}

export function scopeForRole(role: Role): "admin" | "manager" {
  return role === "ADMIN" ? "admin" : "manager";
}
