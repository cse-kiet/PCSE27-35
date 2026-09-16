"use client";

import Link from "next/link";
import { Send, History, Settings, Camera } from "lucide-react";

const actions = [
  {
    href: "/client",
    label: "Send Coins",
    description: "Transfer to another user",
    icon: Send,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20",
  },
  {
    href: "/client",
    label: "Receive",
    description: "Receive via face scan",
    icon: Camera,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20",
  },
  {
    href: "/client",
    label: "Transactions",
    description: "View all past transactions",
    icon: History,
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Manage your account",
    icon: Settings,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20",
  },
];

export const QuickActions = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map(({ href, label, description, icon: Icon, color, bg }) => (
        <Link
          key={label}
          href={href}
          className={`flex flex-col gap-2 p-4 rounded-xl border transition-colors duration-150 ${bg}`}
        >
          <Icon size={18} className={color} />
          <div>
            <p className="text-white text-sm font-semibold">{label}</p>
            <p className="text-white/30 text-xs mt-0.5">{description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
};
