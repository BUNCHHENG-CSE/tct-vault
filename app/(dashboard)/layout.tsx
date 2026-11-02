import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandMenu } from "@/components/command-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Account } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let accounts: Account[] = [];
  if (user) {
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    accounts = (data as Account[]) || [];
  }

  return (
    <SidebarProvider>
      <AppSidebar userEmail={user?.email} />
      <SidebarInset className="relative bg-background font-mono">
        {/* Ambient subtle tech grid */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-25">
          <div className="tech-dots absolute inset-0" />
        </div>

        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/90 px-4 md:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-8 w-8 rounded-md border border-border hover:bg-muted cursor-pointer" />
            <Separator orientation="vertical" className="h-4 bg-border" />
            
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="font-bold text-foreground">tctVault</span>
              <span className="text-muted-foreground/60">/</span>
              <span className="text-muted-foreground hidden sm:inline-block">terminal</span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-[10px] font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>AES-256 RLS</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <CommandMenu accounts={accounts} />
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="relative z-10 flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <React.Suspense fallback={null}>
            {children}
          </React.Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
