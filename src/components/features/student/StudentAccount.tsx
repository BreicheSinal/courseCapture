"use client";

import { useActionState, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { LanguageSelect } from "@/components/ui/LanguageSelect";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { saveThemePreference, signOut } from "@/lib/auth/actions";
import { saveInterfaceLocale, saveProfileName } from "@/lib/profile/actions";
import type { StudentClass } from "@/types/supabase";
import { PageHeader } from "../teacher/PageHeader";

/** Desktop S8 · Account (student): name, appearance and language, classes, join, sign out. */
export function StudentAccount({
  profile,
  classes,
}: {
  profile: { full_name: string; email: string };
  classes: StudentClass[];
}) {
  const t = useTranslations("student.account");
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLButtonElement>(null);
  const stopEditing = () => {
    setEditing(false);
    requestAnimationFrame(() => editRef.current?.focus());
  };
  const [state, action, saving] = useActionState(async (prev: Parameters<typeof saveProfileName>[0], fd: FormData) => {
    const r = await saveProfileName(prev, fd);
    if (r?.saved) stopEditing();
    return r;
  }, undefined);
  const name = profile.full_name || profile.email;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title={t("title")} size="large" />

      <Card as="section" aria-labelledby="profile" className="flex flex-col gap-4">
        <h2 id="profile" className="headline">
          {t("profile")}
        </h2>
        {editing ? (
          <form action={action} className="flex flex-col gap-3" noValidate>
            <Field
              label={t("name")}
              name="full_name"
              defaultValue={profile.full_name}
              maxLength={80}
              required
              autoComplete="name"
              autoFocus
              error={state?.error ? t(state.error === "nameRequired" ? "nameRequired" : "saveFailed") : undefined}
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" busy={saving}>
                {saving ? t("saving") : t("saveName")}
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
              <span className="callout truncate font-semibold">
                <bdi>{name}</bdi>
              </span>
              <span className="footnote truncate text-ink-muted">
                <span dir="ltr">{profile.email}</span> · {t("roleStudent")}
              </span>
            </div>
            <button ref={editRef} type="button" className="cc-btn cc-btn--secondary" onClick={() => setEditing(true)}>
              {t("editNameLabel")}
            </button>
          </div>
        )}
        <p role="status" className="footnote text-success empty:hidden">
          {state?.saved && !editing ? t("nameSaved") : ""}
        </p>
      </Card>

      <Card as="section" aria-labelledby="look" className="flex flex-col gap-4">
        <h2 id="look" className="headline">
          {t("appearance")}
        </h2>
        <div className="self-start">
          <ThemeSwitcher onChange={(p) => void saveThemePreference(p)} />
        </div>
        <p className="footnote text-ink-muted">{t("systemHelp")}</p>
        <LanguageSelect className="max-w-xs" onSelect={async (l) => void (await saveInterfaceLocale(l))} />
      </Card>

      <Card as="section" aria-labelledby="classes" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="classes" className="headline">
            {t("classes")}
          </h2>
          <Link href="/student/join" className={buttonClasses({ variant: "secondary" })}>
            {t("join")}
          </Link>
        </div>
        {classes.length === 0 ? (
          <p className="subhead text-ink-muted">{t("noClasses")}</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {classes.map((c) => (
              <li key={c.class_id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/student/classes/${c.class_id}`}
                  className="flex min-h-control items-center justify-between gap-3 py-2 text-ink no-underline"
                >
                  <span className="callout font-semibold">
                    <bdi>{c.name}</bdi>
                  </span>
                  <span className="subhead text-ink-muted">
                    <bdi>{c.teacher_name}</bdi>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
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
