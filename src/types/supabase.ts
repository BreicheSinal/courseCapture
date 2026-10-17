/**
 * Database types for the Supabase client.
 * Matches supabase/migrations. Regenerate with `pnpm db:types` once Supabase runs locally.
 */
export type UserRole = "teacher" | "student" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected";
export type ThemePref = "system" | "light" | "dark";
export type CourseStatus = "draft" | "assigned" | "archived";
export type CourseLevel = "beginner" | "intermediate" | "advanced";

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole | null;
  status: AccountStatus;
  ui_locale: string;
  theme: ThemePref;
  approved_at: string | null;
  approved_by: string | null;
  approved_via_invite: string | null;
  default_course_locale: string;
  default_course_level: CourseLevel;
  created_at: string;
  updated_at: string;
};

export type ClassRow = {
  id: string;
  teacher_id: string;
  name: string;
  section: string;
  join_code: string;
  created_at: string;
  updated_at: string;
};

export type ClassMemberRow = { class_id: string; student_id: string; joined_at: string };

export type AnnouncementRow = { id: string; class_id: string; author_id: string; body: string; created_at: string };

export type AnnouncementReadRow = { announcement_id: string; student_id: string; seen_at: string };

export type CourseRow = {
  id: string;
  teacher_id: string;
  title: string;
  content_locale: string;
  level: CourseLevel;
  status: CourseStatus;
  source_name: string | null;
  created_at: string;
  updated_at: string;
  assigned_at: string | null;
};

export type CourseAssignmentRow = { course_id: string; class_id: string; due_date: string | null; assigned_at: string };

export type ModuleRow = {
  id: string;
  course_id: string;
  position: number;
  heading: string;
  body: string;
  key_points: string[];
  flashcards: { q: string; a: string }[];
  quiz: { question: string; options: string[] } | null;
  visual_svg: string | null;
  visual_caption: string | null;
  visual_alt: string | null;
};

export type ModuleProgressRow = { student_id: string; module_id: string; course_id: string; completed_at: string };

export type QuizAttemptRow = {
  id: string;
  student_id: string;
  module_id: string;
  course_id: string;
  chosen_index: number;
  is_correct: boolean;
  is_first: boolean;
  created_at: string;
};

export type ClassSummary = {
  id: string;
  name: string;
  section: string;
  join_code: string;
  created_at: string;
  student_count: number;
  course_count: number;
  overdue_students: number;
};

export type ClassCourseStat = {
  course_id: string;
  title: string;
  status: CourseStatus;
  due_date: string | null;
  assigned_at: string;
  module_count: number;
  students_started: number;
  students_complete: number;
  students_overdue: number;
};

export type RosterRow = {
  student_id: string;
  full_name: string;
  email: string;
  joined_at: string;
  modules_done: number;
  quiz_first_correct: number;
  quiz_first_total: number;
};

type ReadOnly<R> = { Row: R; Insert: never; Update: never; Relationships: [] };

export type TeacherInviteRow = {
  code: string;
  school_name: string;
  created_by: string;
  max_uses: number;
  uses: number;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: never;
        Update: Partial<
          Pick<ProfileRow, "full_name" | "ui_locale" | "theme" | "default_course_locale" | "default_course_level">
        >;
        Relationships: [];
      };
      teacher_invites: ReadOnly<TeacherInviteRow>;
      classes: { Row: ClassRow; Insert: never; Update: Partial<Pick<ClassRow, "name" | "section">>; Relationships: [] };
      class_members: ReadOnly<ClassMemberRow>;
      announcements: {
        Row: AnnouncementRow;
        Insert: Pick<AnnouncementRow, "class_id" | "body">;
        Update: never;
        Relationships: [];
      };
      announcement_reads: {
        Row: AnnouncementReadRow;
        Insert: Pick<AnnouncementReadRow, "announcement_id">;
        Update: never;
        Relationships: [];
      };
      courses: ReadOnly<CourseRow>;
      course_assignments: ReadOnly<CourseAssignmentRow>;
      modules: ReadOnly<ModuleRow>;
      module_progress: ReadOnly<ModuleProgressRow>;
      quiz_attempts: ReadOnly<QuizAttemptRow>;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      complete_onboarding: { Args: { p_full_name: string; p_role?: UserRole | null }; Returns: ProfileRow };
      create_teacher_invite: {
        Args: { p_school_name: string; p_max_uses?: number; p_expires_in_days?: number };
        Returns: TeacherInviteRow;
      };
      check_teacher_invite: { Args: { p_code: string }; Returns: { school_name: string; invited_by: string }[] };
      redeem_teacher_invite: { Args: { p_code: string }; Returns: ProfileRow };
      revoke_teacher_invite: { Args: { p_code: string }; Returns: undefined };
      set_teacher_status: { Args: { p_teacher: string; p_status: AccountStatus }; Returns: ProfileRow };
      pending_teachers: { Args: Record<string, never>; Returns: ProfileRow[] };
      create_class: { Args: { p_name: string; p_section?: string }; Returns: ClassRow };
      regenerate_join_code: { Args: { p_class: string }; Returns: string };
      join_class: { Args: { p_code: string }; Returns: { class_id: string; name: string; section: string }[] };
      teacher_class_summaries: { Args: Record<string, never>; Returns: ClassSummary[] };
      class_course_stats: { Args: { p_class: string }; Returns: ClassCourseStat[] };
      class_roster: { Args: { p_class: string; p_course?: string | null }; Returns: RosterRow[] };
    };
    Enums: {
      user_role: UserRole;
      account_status: AccountStatus;
      theme_pref: ThemePref;
      course_status: CourseStatus;
      course_level: CourseLevel;
    };
    CompositeTypes: Record<string, never>;
  };
};
