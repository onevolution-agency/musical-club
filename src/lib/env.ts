import "server-only";

export function siteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return value && value.length > 0 ? value : "http://localhost:3000";
}

export function supabaseUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return value && value.startsWith("http") ? value : null;
}

export function supabasePublishableKey(): string | null {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return value && value.length > 0 ? value : null;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabasePublishableKey());
}

export function serviceRoleKey(): string | null {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return value && value.length > 0 ? value : null;
}

export function mercadoPagoToken(): string | null {
  const value = process.env.MERCADOPAGO_ACCESS_TOKEN;
  return value && value.length > 0 ? value : null;
}

export function mercadoPagoWebhookSecret(): string | null {
  const value = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  return value && value.length > 0 ? value : null;
}

export function attendanceSecret(): string | null {
  const value = process.env.ATTENDANCE_QR_SECRET;
  return value && value.length >= 16 ? value : null;
}

export function isLocalSite(): boolean {
  try {
    const host = new URL(siteUrl()).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return true;
  }
}
