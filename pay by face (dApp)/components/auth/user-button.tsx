"use client";

import { FaUser } from "react-icons/fa";
import { ExitIcon, GearIcon } from "@radix-ui/react-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import { useCurrentUser } from "@/hooks/use-current-user";
import { LogoutButton } from "./logout-button";
import Link from "next/link";

export const UserButton = () => {
  const user = useCurrentUser();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-violet-500/50">
          <Avatar>
            <AvatarImage
              className="h-9 w-9 rounded-full object-cover"
              src={user?.image || ""}
            />
            <AvatarFallback className="bg-violet-600 flex items-center justify-center h-9 w-9 rounded-full">
              <FaUser className="text-white text-xs" />
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-52 bg-[#13131a] border border-white/10 rounded-xl p-1 shadow-xl"
        align="end"
        sideOffset={8}
      >
        {/* User info header */}
        <DropdownMenuLabel className="px-3 py-2">
          <p className="text-white text-sm font-semibold truncate">
            {user?.name ?? "User"}
          </p>
          <p className="text-white/40 text-xs truncate mt-0.5">
            {user?.email ?? ""}
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-white/5 my-1" />

        {/* Settings */}
        <DropdownMenuItem asChild className="focus:bg-white/5 rounded-lg cursor-pointer">
          <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white text-sm">
            <GearIcon className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/5 my-1" />

        {/* Logout */}
        <LogoutButton>
          <DropdownMenuItem className="focus:bg-red-500/10 rounded-lg cursor-pointer px-3 py-2 text-red-400 hover:text-red-300 text-sm gap-2">
            <ExitIcon className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </LogoutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
