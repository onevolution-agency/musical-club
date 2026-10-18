export type Role = "student" | "teacher" | "admin";
export type AgeGroup = "kids" | "youth_adults";
export type BillingFrequency = "monthly" | "biweekly";
export type ActivityStatus = "draft" | "active" | "archived";
export type EnrollmentStatus = "pending" | "active" | "waitlist" | "cancelled" | "completed";
export type SessionStatus = "open" | "closed";
export type AttendanceMethod = "qr" | "manual";
export type FeeStatus = "pending" | "partial" | "paid" | "overdue" | "void";
export type PaymentMethod = "mercadopago" | "efectivo";
export type PaymentStatus = "pending" | "approved" | "rejected" | "void";

export type ProfileRow = {
  id: string;
  role: Role;
  full_name: string;
  email: string | null;
  phone: string | null;
  dni: string | null;
  birth_date: string | null;
  emergency_contact: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  age_group: AgeGroup;
  schedule_label: string;
  weekday: number | null;
  start_time: string | null;
  end_time: string | null;
  location: string;
  capacity: number;
  price_cents: number;
  currency: string;
  billing_frequency: BillingFrequency;
  status: ActivityStatus;
  created_at: string;
  updated_at: string;
};

export type EnrollmentRow = {
  id: string;
  activity_id: string;
  student_id: string;
  status: EnrollmentStatus;
  starts_on: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ClassSessionRow = {
  id: string;
  activity_id: string;
  opened_by: string;
  starts_at: string;
  ends_at: string | null;
  status: SessionStatus;
  notes: string | null;
  created_at: string;
};

export type AttendanceRow = {
  id: string;
  session_id: string;
  student_id: string;
  enrollment_id: string | null;
  method: AttendanceMethod;
  marked_by: string;
  marked_at: string;
};

export type FeeRow = {
  id: string;
  enrollment_id: string;
  student_id: string;
  activity_id: string;
  period_start: string;
  period_end: string;
  due_date: string;
  amount_cents: number;
  currency: string;
  billing_frequency: BillingFrequency;
  status: FeeStatus;
  created_at: string;
  updated_at: string;
};

export type PaymentRow = {
  id: string;
  fee_id: string;
  student_id: string;
  amount_cents: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paid_at: string | null;
  received_by: string | null;
  note: string | null;
  receipt_number: string | null;
  receipt_path: string | null;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  mp_status: string | null;
  checkout_url: string | null;
  created_by: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  created_at: string;
};

export type PaymentAuditRow = {
  id: string;
  payment_id: string;
  action: "created" | "approved" | "rejected" | "voided";
  actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type InquiryRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  community: string | null;
  message: string;
  created_at: string;
};

export type InviteRow = {
  id: string;
  email: string;
  role: "teacher" | "admin";
  full_name: string | null;
  token: string;
  invited_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

export type ActivityTeacherRow = {
  activity_id: string;
  teacher_id: string;
  assigned_at: string;
};

type Table<T> = {
  Row: T;
  Insert: Partial<T> & Record<string, unknown>;
  Update: Partial<T> & Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      activities: Table<ActivityRow>;
      activity_teachers: Table<ActivityTeacherRow>;
      enrollments: Table<EnrollmentRow>;
      class_sessions: Table<ClassSessionRow>;
      attendance_marks: Table<AttendanceRow>;
      fees: Table<FeeRow>;
      payments: Table<PaymentRow>;
      payment_audit: Table<PaymentAuditRow>;
      mp_webhook_events: Table<{
        id: string;
        dedupe_key: string;
        topic: string | null;
        resource_id: string | null;
        payload: Record<string, unknown>;
        result: string | null;
        processed_at: string | null;
        created_at: string;
      }>;
      inquiries: Table<InquiryRow>;
      staff_invites: Table<InviteRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
