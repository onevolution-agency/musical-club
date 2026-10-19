import { requireRole, scopeBarrio } from "@/modules/auth/session";
import { toCsv } from "@/modules/dashboard/domain";
import { todayInArgentina } from "@/lib/time";

export async function GET(request: Request) {
  const ctx = await requireRole(["admin"]);
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo") ?? "pagos";
  const today = todayInArgentina();
  const from = url.searchParams.get("desde") ?? `${today.slice(0, 8)}01`;
  const to = url.searchParams.get("hasta") ?? today;

  if (tipo === "cuotas") {
    const { data } = await scopeBarrio(
      ctx.supabase.from("fees").select("id, student_id, activity_id, period_start, due_date, amount_cents, status").limit(2000),
      ctx.barrioId,
    );
    const csv = toCsv(
      ["id", "alumno", "actividad", "periodo", "vence", "centavos", "estado"],
      (data ?? []).map((fee) => [fee.id, fee.student_id, fee.activity_id, fee.period_start, fee.due_date, String(fee.amount_cents), fee.status]),
    );
    return csvResponse(csv, "cuotas.csv");
  }

  if (tipo === "asistencia") {
    const { data } = await scopeBarrio(
      ctx.supabase.from("attendance_marks").select("session_id, student_id, method, marked_at").limit(5000),
      ctx.barrioId,
    );
    const csv = toCsv(
      ["sesion", "alumno", "metodo", "fecha"],
      (data ?? []).map((mark) => [mark.session_id, mark.student_id, mark.method, mark.marked_at]),
    );
    return csvResponse(csv, "asistencia.csv");
  }

  const { data } = await scopeBarrio(ctx.supabase.from("payments").select("*").limit(2000), ctx.barrioId);
  const rows = (data ?? []).filter((payment) => {
    const day = (payment.paid_at ?? payment.created_at).slice(0, 10);
    return day >= from && day <= to;
  });
  const csv = toCsv(
    ["id", "alumno", "medio", "estado", "centavos", "fecha", "recibio", "recibo"],
    rows.map((payment) => [
      payment.id,
      payment.student_id,
      payment.method,
      payment.status,
      String(payment.amount_cents),
      payment.paid_at ?? payment.created_at,
      payment.received_by ?? "",
      payment.receipt_number ?? "",
    ]),
  );
  return csvResponse(csv, "pagos.csv");
}

function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
