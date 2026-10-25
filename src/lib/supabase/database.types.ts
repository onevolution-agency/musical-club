export type Role = "student" | "teacher" | "admin" | "super_admin";
export type MembershipRole = "student" | "teacher" | "admin";
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
  current_barrio_id: string | null;
  account_kind: "user" | "kid";
  created_at: string;
  updated_at: string;
};

export type BarrioRow = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  active: boolean;
  default_price_cents: number;
  default_billing_frequency: BillingFrequency;
  teen_can_unfollow: boolean;
  created_at: string;
  updated_at: string;
};

export type MembershipRow = {
  user_id: string;
  barrio_id: string;
  role: MembershipRole;
  created_at: string;
};

export type ActivityRow = {
  id: string;
  barrio_id: string;
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
  barrio_id: string;
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
  barrio_id: string;
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
  barrio_id: string;
  session_id: string;
  student_id: string;
  enrollment_id: string | null;
  method: AttendanceMethod;
  marked_by: string;
  marked_at: string;
};

export type FeeRow = {
  id: string;
  barrio_id: string;
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
  barrio_id: string;
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
  barrio_id: string | null;
  message: string;
  created_at: string;
};

export type InviteRow = {
  id: string;
  email: string;
  role: "teacher" | "admin";
  barrio_id: string | null;
  full_name: string | null;
  token: string;
  invited_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

export type ActivityTeacherRow = {
  activity_id: string;
  barrio_id: string;
  teacher_id: string;
  assigned_at: string;
};

export type GuardianAccess = "manager" | "contact" | "follow";
export type GuardianAuditAction = "create" | "link" | "unlink" | "release" | "request" | "accept" | "decline" | "end";
export type FollowDirection = "teen_invite" | "guardian_request";
export type FollowRequestStatus = "pending" | "accepted" | "declined" | "ended";
export type NoticeKind = "absence" | "overdue";

export type GuardianshipRow = {
  id: string;
  guardian_id: string;
  child_id: string;
  barrio_id: string;
  access: GuardianAccess;
  ended_at: string | null;
  notify: boolean;
  created_at: string;
};

export type FollowRequestRow = {
  id: string;
  teen_id: string;
  guardian_id: string | null;
  email: string;
  barrio_id: string;
  direction: FollowDirection;
  status: FollowRequestStatus;
  created_at: string;
  resolved_at: string | null;
};

export type GuardianNoticeRow = {
  id: string;
  guardian_id: string;
  child_id: string;
  barrio_id: string;
  kind: NoticeKind;
  source_id: string;
  created_at: string;
  read_at: string | null;
};

export type GuardianInviteRow = {
  id: string;
  email: string;
  child_id: string;
  barrio_id: string;
  invited_by: string | null;
  accepted_at: string | null;
  created_at: string;
};

export type GuardianAuditRow = {
  id: string;
  child_id: string;
  guardian_id: string | null;
  actor_id: string | null;
  barrio_id: string | null;
  action: GuardianAuditAction;
  note: string | null;
  created_at: string;
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
      barrios: Table<BarrioRow>;
      barrio_memberships: Table<MembershipRow>;
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
      guardianships: Table<GuardianshipRow>;
      guardian_invites: Table<GuardianInviteRow>;
      guardian_audit: Table<GuardianAuditRow>;
      follow_requests: Table<FollowRequestRow>;
      guardian_notices: Table<GuardianNoticeRow>;
    };
    Views: Record<string, never>;
    Functions: {
      create_child: {
        Args: {
          first_name: string;
          last_name: string;
          birth_date: string;
          barrio_id: string;
          guardian_id: string | null;
        };
        Returns: string;
      };
      update_child: {
        Args: { child_id: string; first_name: string; last_name: string; birth_date: string };
        Returns: null;
      };
      invite_guardian: {
        Args: { child_id: string; email: string };
        Returns: null;
      };
      unlink_guardian: {
        Args: { child_id: string; guardian_id: string };
        Returns: null;
      };
      release_child: {
        Args: { child_id: string; email: string; password: string };
        Returns: null;
      };
      expire_follows: { Args: Record<string, never>; Returns: null };
      refresh_follow_notices: { Args: Record<string, never>; Returns: null };
      invite_follower: { Args: { email: string; barrio_id: string }; Returns: null };
      request_follow: { Args: { email: string; barrio_id: string }; Returns: null };
      resolve_follow: { Args: { request_id: string; accept: boolean }; Returns: null };
      end_follow: { Args: { child_id: string; guardian_id: string }; Returns: null };
      admin_link_follow: { Args: { teen_id: string; email: string; barrio_id: string }; Returns: null };
      set_follow_notify: { Args: { child_id: string; enabled: boolean }; Returns: null };
      mark_notice_read: { Args: { notice_id: string }; Returns: null };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
