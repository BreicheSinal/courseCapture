/**
 * Database types for the Supabase client.
 * Matches supabase/migrations. Regenerate with `pnpm db:types` once Supabase runs locally.
 */
export type UserRole = "teacher" | "student" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected";
export type ThemePref = "system" | "light" | "dark";

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
  created_at: string;
  updated_at: string;
};

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
        Update: Partial<Pick<ProfileRow, "full_name" | "ui_locale" | "theme">>;
        Relationships: [];
      };
      teacher_invites: {
        Row: TeacherInviteRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
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
    };
    Enums: { user_role: UserRole; account_status: AccountStatus; theme_pref: ThemePref };
    CompositeTypes: Record<string, never>;
  };
};
