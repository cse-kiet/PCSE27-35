"use client";

import { Menu } from "lucide-react";
import dynamic from "next/dynamic";

// ssr:false prevents the Radix DropdownMenu from generating mismatched IDs
// between server render and client hydration.
const UserButton = dynamic(
  () => import("@/components/auth/user-button").then((m) => m.UserButton),
  {
    ssr: false,
    loading: () => <div className="h-9 w-9 rounded-full bg-white/5 animate-pulse" />,
  }
);

interface DashboardNavbarProps {
  onMenuClick: () => void;
}

export const DashboardNavbar = ({ onMenuClick }: DashboardNavbarProps) => {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-6 h-16 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Spacer on desktop */}
      <div className="hidden lg:block" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        <UserButton />
      </div>
    </header>
  );
};
