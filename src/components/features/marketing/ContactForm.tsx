"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextArea } from "@/components/ui/TextArea";
import { sendContact, type ContactState } from "@/lib/contact/actions";

/** `/contact` form (#59): name, school, email and message, plus a hidden honeypot. */
export function ContactForm() {
  // "Send another message" remounts the form, which clears it and its result.
  const [round, setRound] = useState(0);
  return <Form key={round} onAgain={() => setRound((r) => r + 1)} />;
}

function Form({ onAgain }: { onAgain: () => void }) {
  const t = useTranslations("contact");
  const [state, action, sending] = useActionState<ContactState, FormData>(sendContact, undefined);
  const doneRef = useRef<HTMLHeadingElement>(null);

  const sent = state?.sent === true;
  useEffect(() => {
    if (sent) doneRef.current?.focus();
  }, [sent]);

  if (sent) {
    return (
      <div className="cc-card flex flex-col items-start gap-3" role="status">
        <h2 ref={doneRef} tabIndex={-1} className="headline focus:outline-none">
          {t("sent.title")}
        </h2>
        <p>{t("sent.text", { email: state.email })}</p>
        <Button variant="secondary" onClick={onAgain}>
          {t("sendAnother")}
        </Button>
      </div>
    );
  }

  const fields = state && !state.sent ? state.fields : undefined;
  const values = state && !state.sent ? state.values : undefined;
  const err = (f: "name" | "school" | "email" | "message") => (fields?.[f] ? t(`errors.${f}`) : undefined);

  return (
    <form action={action} className="cc-card flex flex-col gap-4" noValidate>
      <Field label={t("name")} name="name" autoComplete="name" required maxLength={100} defaultValue={values?.name} error={err("name")} />
      <Field
        label={t("school")}
        name="school"
        autoComplete="organization"
        required
        maxLength={150}
        defaultValue={values?.school}
        error={err("school")}
      />
      <Field
        label={t("email")}
        name="email"
        type="email"
        autoComplete="email"
        dir="ltr"
        required
        maxLength={254}
        defaultValue={values?.email}
        error={err("email")}
      />
      <TextArea
        label={t("message")}
        name="message"
        dir="auto"
        rows={6}
        required
        maxLength={4000}
        hint={t("messageHint")}
        defaultValue={values?.message}
        error={err("message")}
      />
      {/* Honeypot: off screen and out of the tab order; people leave it empty. */}
      <div className="sr-only" aria-hidden="true">
        <label>
          {t("honeypot")}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state?.error && (
        <p className="text-danger" role="alert">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <Button type="submit" variant="primary" busy={sending} className="self-start">
        {sending ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
