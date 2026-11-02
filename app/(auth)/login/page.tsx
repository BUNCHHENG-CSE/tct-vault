"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, Lock, Mail, ArrowRight, Loader2, Sparkles, Key } from "lucide-react";
import { loginAction, signupAction } from "@/lib/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = React.useState(false);

  const [loginEmail, setLoginEmail] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");

  const [signupEmail, setSignupEmail] = React.useState("");
  const [signupPassword, setSignupPassword] = React.useState("");
  const [signupConfirm, setSignupConfirm] = React.useState("");

  const autofillDemo = () => {
    setActiveTab("login");
    setLoginEmail("demo@tctvault.com");
    setLoginPassword("demo123456");
    toast.info("Demo credentials loaded! Click 'Enter Vault' to proceed.");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Please enter email and password");
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginAction({
        email: loginEmail,
        password: loginPassword,
      });

      if (res.success) {
        toast.success("Welcome back to tctVault");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to sign in");
      }
    } catch {
      toast.error("An unexpected error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (signupPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (signupPassword !== signupConfirm) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const res = await signupAction({
        email: signupEmail,
        password: signupPassword,
      });

      if (res.success) {
        toast.success("Account created successfully! Welcome to tctVault.");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to create account");
      }
    } catch {
      toast.error("An unexpected error occurred during registration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 bg-background font-mono overflow-hidden">
      {/* Top corner theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Subtle tech dots background */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-20">
        <div className="tech-dots absolute inset-0" />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-5">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-6 w-6" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
                tctVault
              </h1>
              <Badge variant="outline" className="font-mono text-[9px] px-1.5 py-0 border-border">
                TERMINAL
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Keyboard-first personal finance & net-worth engine.
            </p>
          </div>
        </div>

        {/* Demo Credentials Quick-Action Pill */}
        <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/40 text-xs">
          <div className="flex items-center gap-2">
            <Key className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground text-[10px]">Testing or demo?</span>
          </div>
          <button
            type="button"
            onClick={autofillDemo}
            className="px-2 py-0.5 rounded bg-muted hover:bg-accent text-foreground text-[10px] font-mono font-medium transition-colors cursor-pointer border border-border"
          >
            Autofill Demo →
          </button>
        </div>

        {/* Auth Card */}
        <Card className="border-border bg-card shadow-sm rounded-xl overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "login" | "signup")}
            className="w-full"
          >
            <CardHeader className="p-3 pb-2 border-b border-border">
              <TabsList className="grid w-full grid-cols-2 p-0.5 rounded-lg bg-muted border border-border">
                <TabsTrigger value="login" className="text-xs rounded-md cursor-pointer h-7">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-xs rounded-md cursor-pointer h-7">
                  Register
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-4 pt-3.5">
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-[11px] font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@domain.com"
                        className="pl-8 h-8.5 rounded-lg text-xs bg-background"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-[11px] font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-8 h-8.5 rounded-lg text-xs bg-background"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-8.5 rounded-lg gap-2 text-xs font-semibold shadow-2xs cursor-pointer mt-1"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                    {isLoading ? "Signing In..." : "Enter Vault Cockpit"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-[11px] font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@domain.com"
                        className="pl-8 h-8.5 rounded-lg text-xs bg-background"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-[11px] font-medium">Password (min 6 chars)</Label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-8 h-8.5 rounded-lg text-xs bg-background"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-confirm" className="text-[11px] font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="••••••••"
                        className="pl-8 h-8.5 rounded-lg text-xs bg-background"
                        value={signupConfirm}
                        onChange={(e) => setSignupConfirm(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-8.5 rounded-lg gap-2 text-xs font-semibold shadow-2xs cursor-pointer mt-1"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {isLoading ? "Creating Vault..." : "Create Encrypted Vault"}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground font-mono">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Encrypted with Row Level Security (RLS) & AES-256</span>
        </div>
      </div>
    </div>
  );
}
