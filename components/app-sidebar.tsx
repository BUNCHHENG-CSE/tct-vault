"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  CalendarDays,
  Target,
  PiggyBank,
  Activity,
  ShieldCheck,
  LogOut,
  Command,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { signOutAction } from "@/lib/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const navigationItems: Array<{
  title: string;
  url: Route;
  icon: React.ComponentType<{ className?: string }>;
  badge: string | null;
}> = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    title: "Accounts",
    url: "/accounts",
    icon: Landmark,
    badge: null,
  },
  {
    title: "Transactions",
    url: "/transactions",
    icon: ArrowLeftRight,
    badge: "Ledger",
  },
  {
    title: "Subscriptions",
    url: "/subscriptions",
    icon: CalendarDays,
    badge: "Calendar",
  },
  {
    title: "Budgets",
    url: "/budgets",
    icon: Target,
    badge: "Limits",
  },
  {
    title: "Goals",
    url: "/goals",
    icon: PiggyBank,
    badge: "Reserves",
  },
  {
    title: "Intelligence",
    url: "/analytics",
    icon: Activity,
    badge: "Runway",
  },
];

interface AppSidebarProps {
  userEmail?: string | null;
}

export function AppSidebar({ userEmail }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar/95 backdrop-blur-md font-mono">
      <SidebarHeader className="border-b border-sidebar-border/80 px-4 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 tracking-tight group"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-2xs transition-transform duration-150 group-hover:scale-105">
            <ShieldCheck className="h-4.5 w-4.5" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
          </div>

          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-foreground font-mono">
                tctVault
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 font-mono tracking-widest text-muted-foreground border-border"
              >
                MIRA
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>JetBrains Terminal</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2.5">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
            Telemetry
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navigationItems.map((item) => {
                const isActive = pathname === item.url;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={`relative h-9 rounded-lg px-2.5 text-xs font-mono font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs hover:bg-primary hover:text-primary-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                      }`}
                    >
                      <Link href={item.url} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5">
                          <Icon className={`h-4 w-4 transition-colors ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                          <span>{item.title}</span>
                        </div>
                        {item.badge && !isActive && (
                          <span className="hidden group-data-[collapsible=icon]:hidden lg:inline-flex text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted/70 text-muted-foreground border border-border/40">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto px-1 group-data-[collapsible=icon]:hidden">
          <div className="rounded-lg border border-border/80 bg-card/60 p-3 shadow-2xs font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Command className="h-3 w-3 text-muted-foreground" />
                <span>Command Hub</span>
              </div>
              <kbd className="inline-flex h-4.5 items-center gap-0.5 rounded border border-border bg-background px-1 text-[10px] text-muted-foreground font-mono">
                ⌘K
              </kbd>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Press ⌘K to quickly log debits, jump views, or toggle theme.
            </p>
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/80 p-2">
        <div className="flex items-center justify-between rounded-lg bg-card/50 p-2 border border-border/60">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="relative">
              <Avatar className="h-7 w-7 rounded-md border border-border">
                <AvatarFallback className="text-[10px] font-mono font-bold bg-muted text-foreground">
                  {userEmail ? userEmail.slice(0, 2).toUpperCase() : "TV"}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>

            <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
              <span className="truncate text-xs font-medium text-foreground">
                {userEmail || "Terminal User"}
              </span>
              <span className="truncate text-[9px] text-muted-foreground font-mono">
                Encrypted Session
              </span>
            </div>
          </div>

          <form action={signOutAction} className="group-data-[collapsible=icon]:hidden">
            <button
              type="submit"
              className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
              title="Sign Out of Vault"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
