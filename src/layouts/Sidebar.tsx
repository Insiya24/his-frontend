import { NavLink } from "react-router-dom";
import type { NavSection } from "@/routes/navigation";

interface SidebarContentProps {
  sections: NavSection[];
  onNavigate?: () => void;
}

export function SidebarContent({ sections, onNavigate }: SidebarContentProps) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {sections.map((section, sectionIndex) => (
        <div key={section.heading ?? `root-${sectionIndex}`}>
          {section.heading && (
            <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {section.heading}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-sm transition ${
                      isActive
                        ? "bg-brand-600 font-medium text-white shadow-sm"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
