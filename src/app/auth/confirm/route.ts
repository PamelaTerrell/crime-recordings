import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  const destination =
    url.searchParams.get("next") === "/membership"
      ? "/membership"
      : "/cases";

  if (!tokenHash || (type !== "magiclink" && type !== "signup")) {
    return NextResponse.redirect(
      new URL("/login?error=invalid-link", url.origin),
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    console.error("Email verification failed:", error.message);

    return NextResponse.redirect(
      new URL("/login?error=invalid-link", url.origin),
    );
  }

  return NextResponse.redirect(
    new URL(destination, url.origin),
  );
}
