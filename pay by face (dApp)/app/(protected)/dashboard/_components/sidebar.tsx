"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, X, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/client", label: "Wallet", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const DashboardSidebar = ({ open, onClose }: DashboardSidebarProps) => {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        // Base styles — fixed sidebar on desktop, slide-in drawer on mobile
        "fixed top-0 left-0 z-40 h-full w-64 flex flex-col",
        "bg-[#0d0d14] border-r border-white/5",
        "transition-transform duration-300 ease-in-out",
        // Desktop: always visible
        "lg:translate-x-0",
        // Mobile: slide in/out
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo / brand */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/5 shrink-0">
        <span className="text-white font-bold text-lg tracking-tight">
          Face<span className="text-violet-400">TM</span>
        </span>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-violet-500/15 text-violet-300 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]"
                  : "text-white/40 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <Icon
                size={17}
                className={isActive ? "text-violet-400" : "text-current"}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/5 shrink-0">
        <p className="text-white/20 text-xs text-center">FaceTM &copy; 2025</p>
      </div>
    </aside>
  );
};
