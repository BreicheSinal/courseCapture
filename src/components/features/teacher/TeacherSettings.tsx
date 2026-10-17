"use client";

import { useActionState, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { LanguageSelect } from "@/components/ui/LanguageSelect";
import { Select } from "@/components/ui/Select";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { localeNames, locales } from "@/i18n/locales";
import { signOut, saveThemePreference } from "@/lib/auth/actions";
import { saveCourseDefaults, saveProfileName } from "@/lib/classes/actions";
import { saveInterfaceLocale } from "@/lib/profile/actions";
import type { CourseLevel } from "@/types/supabase";
import { PageHeader } from "./PageHeader";

type Profile = {
  full_name: string;
  email: string;
  default_course_locale: string;
  default_course_level: CourseLevel;
};

/** Canvas T14 / Desktop T8 · Settings: profile, new course defaults, appearance, language, sign out. */
export function TeacherSettings({ profile }: { profile: Profile }) {
  const t = useTranslations("teacher.settings");
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLButtonElement>(null);
  const stopEditing = () => {
    setEditing(false);
    // The form goes away: put focus back on the Edit button.
    requestAnimationFrame(() => editRef.current?.focus());
  };
  const [nameState, nameAction, savingName] = useActionState(async (prev: Parameters<typeof saveProfileName>[0], fd: FormData) => {
    const r = await saveProfileName(prev, fd);
    if (r?.saved) stopEditing();
    return r;
  }, undefined);
  const [defaultsState, defaultsAction, savingDefaults] = useActionState(saveCourseDefaults, undefined);

  const name = profile.full_name || profile.email;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title={t("title")} size="large" />

      <Card as="section" aria-labelledby="profile" className="flex flex-col gap-4">
        <h2 id="profile" className="headline">
          {t("profile")}
        </h2>
        {editing ? (
          <form action={nameAction} className="flex flex-col gap-3" noValidate>
            <Field
              label={t("name")}
              name="full_name"
              defaultValue={profile.full_name}
              maxLength={80}
              required
              autoComplete="name"
              autoFocus
              error={nameState?.error ? t(nameState.error === "nameRequired" ? "nameRequired" : "saveFailed") : undefined}
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" busy={savingName}>
                {savingName ? t("saving") : t("saveName")}
              </Button>
              <Button variant="secondary" onClick={stopEditing}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar name={name} size="lg" decorative />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="callout truncate font-semibold">{name}</span>
              <span className="footnote truncate text-ink-muted">
                <span dir="ltr">{profile.email}</span> · {t("roleTeacher")}
              </span>
            </div>
            <button
              ref={editRef}
              type="button"
              className="cc-btn cc-btn--secondary"
              onClick={() => setEditing(true)}
              aria-label={t("editNameLabel")}
            >
              {t("edit")}
            </button>
          </div>
        )}
        <p role="status" className="footnote text-success empty:hidden">
          {nameState?.saved && !editing ? t("nameSaved") : ""}
        </p>
      </Card>

      <Card as="section" aria-labelledby="defaults" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="defaults" className="headline">
            {t("defaults")}
          </h2>
          <p className="footnote text-ink-muted">{t("defaultsHelp")}</p>
        </div>
        <form action={defaultsAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label={t("courseLanguage")} name="default_course_locale" defaultValue={profile.default_course_locale}>
              {locales.map((l) => (
                <option key={l} value={l} lang={l}>
                  {localeNames[l]}
                </option>
              ))}
            </Select>
            <Select label={t("level")} name="default_course_level" defaultValue={profile.default_course_level}>
              {(["beginner", "intermediate", "advanced"] as const).map((l) => (
                <option key={l} value={l}>
                  {t(`level_${l}`)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="secondary" busy={savingDefaults}>
              {savingDefaults ? t("saving") : t("saveDefaults")}
            </Button>
            <span role="status" className="footnote text-success">
              {defaultsState?.saved ? t("defaultsSaved") : ""}
            </span>
            {defaultsState?.error && (
              <span role="alert" className="footnote text-danger">
                {t("saveFailed")}
              </span>
            )}
          </div>
        </form>
      </Card>

      <Card as="section" aria-labelledby="look" className="flex flex-col gap-4">
        <h2 id="look" className="headline">
          {t("appearance")}
        </h2>
        {/* Saved to the profile too: it wins on the next sign-in (docs/theming.md). */}
        <div className="self-start">
          <ThemeSwitcher onChange={(p) => void saveThemePreference(p)} />
        </div>
        <p className="footnote text-ink-muted">{t("systemHelp")}</p>
        <LanguageSelect className="max-w-xs" onSelect={async (l) => void (await saveInterfaceLocale(l))} />
      </Card>

      <form action={signOut}>
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" variant="secondary" block className="text-danger">
          <Icon name="signOut" />
          {t("signOut")}
        </Button>
      </form>
    </div>
  );
}
