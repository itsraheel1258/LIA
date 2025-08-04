
"use client";

import { useAuth } from "@/hooks/use-auth";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { HardDrive, LogOut, User as UserIcon } from "lucide-react";
import { LiaLogo } from "./icons/lia-logo";

export function PageHeader() {
  const { user, logout, isFirebaseEnabled } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex items-center">
          <LiaLogo className="h-8" />
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {isFirebaseEnabled && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.photoURL ?? ""} alt={user?.displayName ?? ""} />
                    <AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <HardDrive className="mr-2 h-4 w-4" />
                  <span>Storage: 0.05GB / 1GB</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
           {!user && (
             <Avatar className="h-9 w-9">
              <AvatarFallback><UserIcon size={20} /></AvatarFallback>
            </Avatar>
           )}
        </div>
      </div>
    </header>
  );
}
