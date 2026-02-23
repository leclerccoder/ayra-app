"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    MessageSquare,
    FolderKanban,
    Bell,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    UserPlus,
    Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
    user: { name: string; email: string; role: string } | null;
    unreadCount: number;
    logoutAction: () => void;
}

const navItems = [
    { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
    { href: "/portal/enquiries", label: "Enquiries", icon: MessageSquare },
    { href: "/portal/projects", label: "Projects", icon: FolderKanban },
    { href: "/portal/notifications", label: "Notifications", icon: Bell },
];

export function Sidebar({ user, unreadCount, logoutAction }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = React.useState(false);
    const [mobileOpen, setMobileOpen] = React.useState(false);

    const isActive = (href: string) => {
        if (href === "/portal") return pathname === "/portal";
        return pathname.startsWith(href);
    };

    const SidebarContent = () => (
        <div className="flex h-full flex-col overflow-y-auto">
            {/* Logo */}
            <div className="flex min-h-[72px] items-center gap-3 border-b px-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
                    <span className="text-xl font-bold text-primary-foreground">A</span>
                </div>
                {!collapsed && (
                    <div className="flex flex-1 flex-col min-w-0">
                        <span className="text-lg font-semibold tracking-tight truncate">Ayra Portal</span>
                        <span className="text-sm text-muted-foreground truncate">Escrow Management</span>
                    </div>
                )}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="hidden md:inline-flex shrink-0 h-8 w-8"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>

            {/* User section */}
            <div className="px-4 py-4">
                {user ? (
                    <div className="flex flex-col gap-3">
                        <div className={cn("flex items-center gap-3 rounded-lg bg-muted/50 p-2.5", collapsed && "justify-center p-2.5")}>
                            <Avatar className="h-9 w-9 shrink-0">
                                <AvatarImage src="" />
                                <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
                                    {user.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            {!collapsed && (
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-base font-semibold truncate">{user.name}</span>
                                    <span className="text-sm text-muted-foreground truncate">{user.role}</span>
                                </div>
                            )}
                        </div>
                        <form action={logoutAction}>
                            <Button
                                type="submit"
                                variant="ghost"
                                size="default"
                                className={cn("h-10 w-full justify-start gap-2.5 text-sm", collapsed && "justify-center px-0")}
                            >
                                <LogOut className="h-4 w-4 shrink-0" />
                                {!collapsed && <span>Logout</span>}
                            </Button>
                        </form>
                    </div>
                ) : (
                    <Link href="/portal/login">
                        <Button variant="outline" size="sm" className="w-full text-sm">
                            {collapsed ? <LogOut className="h-4 w-4" /> : "Sign In"}
                        </Button>
                    </Link>
                )}
            </div>

            <Separator />

            {/* Navigation */}
            <nav className="flex-1 space-y-1.5 px-3 py-4">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-medium transition-colors",
                            isActive(item.href)
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && (
                            <span className="flex-1 flex items-center justify-between">
                                {item.label}
                                {item.label === "Notifications" && unreadCount > 0 && (
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[11px] font-medium text-destructive-foreground">
                                        {unreadCount}
                                    </span>
                                )}
                            </span>
                        )}
                    </Link>
                ))}

                {user?.role === "ADMIN" && (
                    <Link
                        href="/portal/admin"
                        title="Admin"
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-medium transition-colors",
                            isActive("/portal/admin") &&
                                !pathname.startsWith("/portal/admin/invites") &&
                                !pathname.startsWith("/portal/admin/clients")
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <Settings className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Admin</span>}
                    </Link>
                )}

                {user?.role === "ADMIN" && (
                    <Link
                        href="/portal/admin/invites"
                        title="Invites"
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-medium transition-colors",
                            pathname.startsWith("/portal/admin/invites")
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <UserPlus className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Invites</span>}
                    </Link>
                )}

                {user?.role === "ADMIN" && (
                    <Link
                        href="/portal/admin/clients"
                        title="Clients"
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-medium transition-colors",
                            pathname.startsWith("/portal/admin/clients")
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <Users className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Clients</span>}
                    </Link>
                )}
            </nav>

            {/* Collapse button moved to header */}
        </div>
    );

    return (
        <>
            {/* Mobile header */}
            <div className="flex h-14 items-center gap-3 border-b bg-background px-4 md:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMobileOpen(!mobileOpen)}>
                    <Menu className="h-5 w-5" />
                </Button>
                <span className="text-base font-semibold">Ayra Portal</span>
            </div>

            {/* Mobile sidebar overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-background transition-transform md:hidden",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <SidebarContent />
            </aside>

            {/* Desktop sidebar */}
            <aside
                className={cn(
                    "sidebar-desktop hidden md:!flex h-screen shrink-0 border-r bg-background shadow-sm transition-all duration-200 sticky top-0 flex-col",
                    collapsed ? "w-16" : "w-64"
                )}
            >
                <SidebarContent />
            </aside>
        </>
    );
}
