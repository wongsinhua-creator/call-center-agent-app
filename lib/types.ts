export type Channel = "phone" | "chat" | "email";
export type Status = "open" | "in_progress" | "resolved";
export type Priority = "low" | "medium" | "high";
export type ReviewStatus = "unreviewed" | "confirmed" | "overridden";
export type AuditAction =
  | "created"
  | "status_change"
  | "ai_tagged"
  | "category_override"
  | "assigned";
export type Actor = "agent" | "system";

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  color: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  user_id: string | null;
  caller_name: string;
  caller_phone: string | null;
  channel: Channel;
  description: string;
  status: Status;
  priority: Priority;
  handled_by: string | null;
  category_id: string | null;
  category_ai: string | null;
  category_ai_source: string | null;
  category_ai_confidence: number | null;
  category_ai_review_status: ReviewStatus;
  urgency_score: number | null;
  urgency_score_source: string | null;
  urgency_score_confidence: number | null;
  urgency_score_review_status: ReviewStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ComplaintWithCategory extends Complaint {
  category: Category | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  complaint_id: string;
  action: AuditAction;
  actor: Actor;
  actor_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}
