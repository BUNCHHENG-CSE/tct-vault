import { NextResponse } from "next/server";
import { getPlaidConfig, isPlaidConfigured } from "@/lib/plaid";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getPlaidConfig();

    if (!isPlaidConfigured()) {
      // In sandbox/demo mode without Plaid API keys:
      return NextResponse.json({
        link_token: "mock-link-token-sandbox",
        is_demo: true,
        message: "Plaid credentials not configured in environment. Running in Demo / Simulation mode.",
      });
    }

    // Call live Plaid API if configured
    const plaidUrl =
      config.env === "production"
        ? "https://production.plaid.com"
        : config.env === "development"
        ? "https://development.plaid.com"
        : "https://sandbox.plaid.com";

    const response = await fetch(`${plaidUrl}/link/token/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        secret: config.secret,
        client_name: "tctVault Financial Suite",
        country_codes: ["US", "CA", "GB"],
        language: "en",
        user: { client_user_id: user.id },
        products: ["transactions", "auth"],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
