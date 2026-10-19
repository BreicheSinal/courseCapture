/**
 * Database types for the Supabase client.
 * Matches supabase/migrations. Regenerate with `pnpm db:types` once Supabase runs locally.
 */
export type UserRole = "teacher" | "student" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected";
export type ThemePref = "system" | "light" | "dark";
export type CourseStatus = "draft" | "assigned" | "archived";
export type CourseLevel = "beginner" | "intermediate" | "advanced";
export type JobStep = "queued" | "reading" | "writing" | "drawing" | "done" | "failed";

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
  /** Why the teacher should check it; "@fallback" when the basic splitter wrote it. */
  review_note: string | null;
  checked_at: string | null;
};

export type GenerationJobRow = {
  id: string;
  course_id: string;
  teacher_id: string;
  step: JobStep;
  source_kind: "pdf" | "pptx" | "text" | "paste";
  source_path: string | null;
  notes: string;
  pages_total: number | null;
  pages_scanned: number | null;
  chunks_total: number;
  chunks_done: number;
  modules_total: number;
  modules_drawn: number;
  fallback_chunks: number;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export type AiUsageRow = {
  id: number;
  user_id: string;
  kind: "generate" | "redraw" | "tutor";
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
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

export type QuizAnswerRow = { module_id: string; answer_index: number; explanation: string };

export type StudentCourse = {
  course_id: string;
  title: string;
  content_locale: string;
  class_id: string;
  class_name: string;
  due_date: string | null;
  module_count: number;
  modules_done: number;
  quiz_correct: number;
  quiz_answered: number;
  last_done_at: string | null;
};

export type StudentModuleState = {
  module_id: string;
  position: number;
  heading: string;
  done: boolean;
  quiz_correct: boolean | null;
  has_quiz: boolean;
};

export type StudentClass = { class_id: string; name: string; section: string; teacher_name: string; joined_at: string };

export type StudentAnnouncement = {
  id: string;
  class_id: string;
  class_name: string;
  teacher_name: string;
  body: string;
  created_at: string;
  seen: boolean;
};

export type QuizResult = { is_correct: boolean; answer_index: number; explanation: string; first_try: boolean };

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
      courses: {
        Row: CourseRow;
        Insert: Pick<CourseRow, "teacher_id" | "title"> &
          Partial<Pick<CourseRow, "content_locale" | "level" | "source_name">>;
        Update: Partial<Pick<CourseRow, "title" | "content_locale" | "level">>;
        Relationships: [];
      };
      course_assignments: ReadOnly<CourseAssignmentRow>;
      // Clients edit modules through functions; inserts and diagram updates are service-role only.
      modules: {
        Row: ModuleRow;
        Insert: Omit<ModuleRow, "id" | "review_note" | "checked_at" | "visual_svg" | "visual_caption" | "visual_alt"> &
          Partial<Pick<ModuleRow, "review_note" | "visual_svg" | "visual_caption" | "visual_alt">>;
        Update: Partial<Pick<ModuleRow, "visual_svg" | "visual_caption" | "visual_alt">>;
        Relationships: [];
      };
      generation_jobs: {
        Row: GenerationJobRow;
        Insert: Pick<GenerationJobRow, "course_id" | "teacher_id" | "source_kind"> &
          Partial<Pick<GenerationJobRow, "source_path" | "notes" | "step">>;
        Update: Partial<Omit<GenerationJobRow, "id" | "course_id" | "teacher_id" | "created_at">>;
        Relationships: [];
      };
      ai_usage: ReadOnly<AiUsageRow>;
      module_progress: ReadOnly<ModuleProgressRow>;
      quiz_attempts: ReadOnly<QuizAttemptRow>;
      quiz_answers: { Row: QuizAnswerRow; Insert: QuizAnswerRow; Update: never; Relationships: [] };
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
      answer_quiz: { Args: { p_module: string; p_choice: number }; Returns: QuizResult[] };
      my_quiz_result: {
        Args: { p_module: string };
        Returns: { chosen_index: number; is_correct: boolean; answer_index: number; explanation: string }[];
      };
      complete_module: { Args: { p_module: string }; Returns: { course_id: string; done: number; total: number }[] };
      mark_announcements_seen: { Args: { p_ids: string[] }; Returns: undefined };
      student_classes: { Args: Record<string, never>; Returns: StudentClass[] };
      student_courses: { Args: Record<string, never>; Returns: StudentCourse[] };
      student_course_modules: { Args: { p_course: string }; Returns: StudentModuleState[] };
      student_announcements: { Args: { p_class?: string | null; p_limit?: number }; Returns: StudentAnnouncement[] };
      claim_ai_use: {
        Args: {
          p_user: string;
          p_kind: AiUsageRow["kind"];
          p_limit: number | null;
          p_provider: string;
          p_model: string;
        };
        Returns: number;
      };
      add_ai_tokens: { Args: { p_use: number; p_input: number; p_output: number }; Returns: undefined };
      claim_contact_slot: { Args: { p_sender: string; p_limit: number; p_window: string }; Returns: boolean };
      my_ai_usage_today: { Args: Record<string, never>; Returns: { kind: AiUsageRow["kind"]; used: number }[] };
      module_review_notes: { Args: { p_course: string }; Returns: { module_id: string; review_note: string }[] };
      save_module: {
        Args: {
          p_module: string;
          p_heading: string;
          p_body: string;
          p_key_points: string[];
          p_flashcards: { q: string; a: string }[];
          p_quiz: { question: string; options: string[] } | null;
          p_answer_index: number | null;
          p_explanation: string;
          p_caption: string;
          p_alt: string;
        };
        Returns: undefined;
      };
      set_module_checked: { Args: { p_module: string; p_checked: boolean }; Returns: undefined };
      clear_module_visual: { Args: { p_module: string }; Returns: undefined };
      move_module: { Args: { p_module: string; p_offset: number }; Returns: number };
      delete_module: { Args: { p_module: string }; Returns: undefined };
      assign_course: { Args: { p_course: string; p_class: string; p_due: string | null }; Returns: undefined };
      unassign_course: { Args: { p_course: string; p_class: string }; Returns: undefined };
    };
    Enums: {
      user_role: UserRole;
      account_status: AccountStatus;
      theme_pref: ThemePref;
      course_status: CourseStatus;
      course_level: CourseLevel;
      job_step: JobStep;
    };
    CompositeTypes: Record<string, never>;
  };
};
