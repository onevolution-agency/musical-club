import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/modules/auth/session";
import type { Role } from "@/lib/supabase/database.types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && type) {
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  }
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  let destination = "/alumno";
  if (userId) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (profile?.role) destination = homeFor(profile.role as Role);
  }
  return NextResponse.redirect(new URL(destination, siteUrl()));
}
