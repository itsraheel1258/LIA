
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
import { HardDrive, LogOut, User as UserIcon, Search, Bell } from "lucide-react";
import { Input } from "./ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, FormEvent } from "react";

export function PageHeader({ children }: { children?: React.ReactNode }) {
  const { user, logout, isFirebaseEnabled } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");

  useEffect(() => {
    // Keep input in sync with URL on back/forward navigation
    setSearchValue(searchParams.get("search") || "");
  }, [searchParams]);


  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchValue) {
        params.set("search", searchValue);
    } else {
        params.delete("search");
    }
    // Only apply search to the documents page
    router.push(`/dashboard/documents?${params.toString()}`);
  }

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 sticky top-0 z-30">
        {children}
        <div className="w-full flex-1">
            {pathname.startsWith('/dashboard/documents') && (
                 <form onSubmit={handleSearchSubmit}>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search my files..."
                            className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                    </div>
                </form>
            )}
        </div>

        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="h-9 w-9">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Toggle notifications</span>
            </Button>

            {isFirebaseEnabled && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
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
      </header>
  );
}
