
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Folder, Trash2, Settings, Download, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Card, CardContent, CardHeader } from "../ui/card";

const navItems = [
    { href: "/dashboard", label: "Add New Document", icon: Home },
    { href: "/dashboard/documents", label: "My Documents", icon: Folder },
    { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
    { href: "/dashboard/trash", label: "Trash", icon: Trash2 },
];

export function DashboardSidebar() {
    const pathname = usePathname();
    const storageUsed = 0.08;
    const storageTotal = 15.0;
    const storagePercentage = (storageUsed / storageTotal) * 100;

    return (
        <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-16 items-center border-b px-4 lg:px-6">
                <Link href="/" className="flex items-center gap-2 font-bold font-headline text-xl">
                    Lia
                </Link>
            </div>
            <div className="flex-1 overflow-auto py-2">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                pathname === item.href && "bg-primary/10 text-primary"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </div>
            <div className="mt-auto p-4 space-y-4">
                <Card>
                    <CardContent className="p-3">
                        <Button size="sm" className="w-full">
                            <Download className="mr-2 h-4 w-4" />
                            Download For PC/Mac
                        </Button>
                    </CardContent>
                </Card>
                <div>
                     <div className="text-xs text-muted-foreground flex justify-between mb-1">
                        <span>{storageUsed.toFixed(2)}GB / {storageTotal.toFixed(2)}GB</span>
                        <Link href="#" className="hover:underline text-primary">Expand</Link>
                    </div>
                    <Progress value={storagePercentage} className="h-2" />
                </div>
            </div>
        </div>
    );
}
