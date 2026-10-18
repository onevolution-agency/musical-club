import type { AgeGroup, BillingFrequency, FeeStatus, PaymentMethod, PaymentStatus } from "@/lib/supabase/database.types";

export const ageGroupCopy: Record<AgeGroup, string> = {
  kids: "Grupo Kids: Niños y niñas hasta los 12 años.",
  youth_adults: "Grupo Jóvenes y Adultos: A partir de 13 años (sin límite de edad).",
};

export const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

export const frequencyLabel: Record<BillingFrequency, string> = {
  monthly: "Mensual",
  biweekly: "Cada 15 días",
};

export const feeStatusLabel: Record<FeeStatus, string> = {
  pending: "Pendiente",
  partial: "Parcial",
  paid: "Paga",
  overdue: "Vencida",
  void: "Anulada",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  mercadopago: "Mercado Pago",
  efectivo: "Efectivo",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  approved: "Acreditado",
  rejected: "Rechazado",
  void: "Anulado",
};

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
