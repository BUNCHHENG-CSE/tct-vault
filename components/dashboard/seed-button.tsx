"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { seedDemoDataAction } from "@/lib/actions/seed";
import { Button } from "@/components/ui/button";

interface SeedButtonProps {
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
}

export function SeedButton({
  variant = "default",
  size = "default",
  className,
  label = "Load Demo Data",
}: SeedButtonProps) {
  const [isSeeding, setIsSeeding] = React.useState(false);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await seedDemoDataAction();
      if (res.success) {
        toast.success("Demo financial portfolio loaded!", {
          description:
            "5 accounts, 49 transactions (6-month history), 7 subscriptions & 6 budgets seeded.",
        });
      } else {
        toast.error(res.error || "Failed to load demo data");
      }
    } catch {
      toast.error("An unexpected error occurred during demo data seeding");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleSeed}
      disabled={isSeeding}
    >
      {isSeeding ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Sparkles className="h-4 w-4 mr-2 text-amber-400 animate-pulse" />
      )}
      {isSeeding ? "Generating Portfolio..." : label}
    </Button>
  );
}
