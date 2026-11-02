import { NextResponse } from "next/server";
import { getPlaidConfig, isPlaidConfigured } from "@/lib/plaid";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { public_token, institution } = await req.json();

    if (!isPlaidConfigured()) {
      return NextResponse.json({
        access_token: "mock-access-token-sandbox",
        item_id: "mock-item-sandbox",
        is_demo: true,
      });
    }

    const config = getPlaidConfig();
    const plaidUrl =
      config.env === "production"
        ? "https://production.plaid.com"
        : config.env === "development"
        ? "https://development.plaid.com"
        : "https://sandbox.plaid.com";

    const response = await fetch(`${plaidUrl}/item/public_token/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        secret: config.secret,
        public_token,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
