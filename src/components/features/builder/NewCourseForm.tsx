"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Select } from "@/components/ui/Select";
import { Steps } from "@/components/ui/Steps";
import { TextArea } from "@/components/ui/TextArea";
import { localeNames, locales } from "@/i18n/locales";
import { prepareUpload, startGeneration, type NewCourseError, type StartState } from "@/lib/generation/actions";
import { cn } from "@/lib/utils/cn";
import type { CourseLevel } from "@/types/supabase";

const MAX_BYTES = 20 * 1024 * 1024;
const MIN_CHARS = 80;
const MAX_CHARS = 100_000;
const accepted = /\.(pdf|pptx|txt|md|markdown)$/i;

type Upload =
  | { state: "idle" }
  | { state: "uploading"; name: string; size: number; loaded: number }
  | { state: "done"; name: string; size: number; uploadId: string }
  | { state: "error"; error: NewCourseError | "uploadFailed"; size?: number };

/**
 * T1 · New course: a paper or slides (or pasted text), course language and
 * level, optional notes for Claude. The file uploads straight to private
 * storage as soon as it's chosen; "Generate course" waits for it to finish.
 */
export function NewCourseForm({
  classId,
  defaults,
  aiReady,
  generationsLeft,
}: {
  classId: string | null;
  defaults: { locale: string; level: CourseLevel };
  aiReady: boolean;
  generationsLeft: number;
}) {
  const t = useTranslations("teacher.newCourse");
  const ts = useTranslations("teacher.settings");
  const format = useFormatter();
  const locale = useLocale();
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [upload, setUpload] = useState<Upload>({ state: "idle" });
  const [over, setOver] = useState(false);
  const [text, setText] = useState("");
  const [waiting, setWaiting] = useState(false); // "Generate" pressed during the upload
  const xhr = useRef<XMLHttpRequest | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const liveId = useId();
  const dropErrorId = useId();

  const [state, action, pending] = useActionState<StartState, FormData>(startGeneration, undefined);
  const size = (bytes: number) => format.number(bytes / 1024 / 1024, { maximumFractionDigits: 1 }) + " MB";
  const errorText = (e: NewCourseError | "uploadFailed", bytes?: number) =>
    e === "size" ? t("errors.size", { size: size(bytes ?? 0) }) : t(`errors.${e}`);

  useEffect(() => () => xhr.current?.abort(), []);

  // Pressed "Generate course" while uploading: submit once the upload is done.
  const waitingRef = useRef(false);
  const wait = (on: boolean) => {
    waitingRef.current = on;
    setWaiting(on);
  };

  async function choose(file: File | undefined) {
    xhr.current?.abort();
    if (!file) return;
    if (!accepted.test(file.name)) return setUpload({ state: "error", error: "type" });
    if (file.size > MAX_BYTES) return setUpload({ state: "error", error: "size", size: file.size });
    if (file.size === 0) return setUpload({ state: "error", error: "empty" });
    setUpload({ state: "uploading", name: file.name, size: file.size, loaded: 0 });
    const ticket = await prepareUpload({ fileName: file.name, size: file.size });
    if (!ticket.ok) return setUpload({ state: "error", error: ticket.error, size: file.size });
    const req = new XMLHttpRequest();
    xhr.current = req;
    req.open("PUT", ticket.signedUrl);
    req.setRequestHeader("content-type", ticket.contentType);
    req.setRequestHeader("x-upsert", "false");
    req.upload.onprogress = (e) => setUpload({ state: "uploading", name: file.name, size: file.size, loaded: e.loaded });
    req.onload = () => {
      const ok = req.status >= 200 && req.status < 300;
      setUpload(ok ? { state: "done", name: file.name, size: file.size, uploadId: ticket.uploadId } : { state: "error", error: "uploadFailed" });
      if (waitingRef.current) {
        wait(false);
        // After React renders the upload's hidden fields.
        if (ok) setTimeout(() => formRef.current?.requestSubmit(), 0);
      }
    };
    req.onerror = () => {
      setUpload({ state: "error", error: "uploadFailed" });
      wait(false);
    };
    req.send(file);
  }

  function clear() {
    xhr.current?.abort();
    setUpload({ state: "idle" });
    wait(false);
  }

  const chars = [...text].length;
  const limitReached = generationsLeft <= 0;
  const ready = !limitReached && (mode === "paste" ? chars >= MIN_CHARS && chars <= MAX_CHARS : upload.state === "done");
  const busy = pending || waiting;
  const serverError = state?.error ? t(`errors.${state.error}`) : null;
  const pct = upload.state === "uploading" ? Math.round((upload.loaded / upload.size) * 100) : 100;

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        if (busy) return e.preventDefault();
        if (!limitReached && mode === "file" && upload.state === "uploading") {
          e.preventDefault();
          wait(true);
        } else if (!ready) {
          e.preventDefault();
        }
      }}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="mode" value={mode} />
      {classId && <input type="hidden" name="class" value={classId} />}
      {upload.state === "done" && (
        <>
          <input type="hidden" name="upload" value={upload.uploadId} />
          <input type="hidden" name="file_name" value={upload.name} />
        </>
      )}

      <Steps label={t("steps.label")} steps={[t("steps.source"), t("steps.generate"), t("steps.review")]} current={0} />

      {limitReached && (
        <div className="cc-notice cc-notice--warning subhead" role="note">
          <Icon name="clock" />
          <p>{t("errors.dailyLimit")}</p>
        </div>
      )}
      {!aiReady && (
        <div className="cc-notice subhead" role="note">
          <Icon name="info" />
          <p>{t("noAi")}</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section aria-label={t("sourceLabel")} className="flex flex-col gap-3">
          {mode === "file" ? (
            <>
              {upload.state !== "uploading" && upload.state !== "done" && (
                <label
                  className={cn("cc-drop", over && "is-over", upload.state === "error" && "is-error")}
                  onDragEnter={() => setOver(true)}
                  onDragLeave={() => setOver(false)}
                  onDrop={() => setOver(false)}
                >
                  <input
                    type="file"
                    className="cc-drop__input"
                    accept=".pdf,.pptx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown"
                    aria-describedby={upload.state === "error" ? dropErrorId : undefined}
                    onChange={(e) => {
                      void choose(e.currentTarget.files?.[0]);
                      e.currentTarget.value = "";
                    }}
                  />
                  <span className="cc-drop__icon">
                    <Icon name="upload" />
                  </span>
                  <span className="cc-drop__title">{t("dropTitle")}</span>
                  <span className="cc-drop__hint">{t("dropHint")}</span>
                  <span className={buttonLike}>{t("chooseFile")}</span>
                  {upload.state === "error" && (
                    <span id={dropErrorId} className="cc-drop__error" role="alert">
                      {errorText(upload.error, upload.size)}
                    </span>
                  )}
                </label>
              )}
              {(upload.state === "uploading" || upload.state === "done") && (
                <Card className="cc-file">
                  <span className="grid size-10 flex-none place-items-center rounded-sm bg-surface-sunken">
                    <Icon name="file" width={20} height={20} />
                  </span>
                  <span className="cc-file__body">
                    <span className="flex justify-between gap-2">
                      <span className="cc-file__name">
                        <bdi>{upload.name}</bdi>
                      </span>
                      {upload.state === "uploading" && <span className="caption text-ink-muted tabular-nums">{pct}%</span>}
                    </span>
                    {upload.state === "uploading" && (
                      <div
                        className="cc-progress"
                        role="progressbar"
                        aria-label={t("uploadProgress", { name: upload.name })}
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <i style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    <span className="cc-file__meta" id={liveId} aria-live="polite">
                      {upload.state === "uploading" ? t("uploading", { size: size(upload.size) }) : t("uploaded", { size: size(upload.size) })}
                    </span>
                  </span>
                  <IconButton
                    icon="close"
                    label={upload.state === "uploading" ? t("cancelUpload") : t("removeFile", { name: upload.name })}
                    onClick={clear}
                  />
                </Card>
              )}
              <Button variant="ghost" className="self-start" onClick={() => (clear(), setMode("paste"))}>
                {t("pasteText")}
              </Button>
            </>
          ) : (
            <>
              <TextArea
                label={t("pasteLabel")}
                name="text"
                rows={10}
                value={text}
                onChange={(e) => setText(e.currentTarget.value)}
                hint={t("pasteHint")}
                meta={`${format.number(chars)}/${format.number(MAX_CHARS)}`}
                error={state?.field === "text" ? serverError : chars > MAX_CHARS ? t("errors.tooLong") : undefined}
                dir="auto"
                autoFocus
              />
              <Button variant="ghost" className="self-start" onClick={() => setMode("file")}>
                {t("useFile")}
              </Button>
            </>
          )}
        </section>

        <Card as="section" aria-labelledby="course-settings" className="flex flex-col gap-4">
          <h2 id="course-settings" className="headline">
            {t("settingsTitle")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Select label={t("language")} name="content_locale" defaultValue={defaults.locale}>
              {locales.map((l) => (
                <option key={l} value={l}>
                  {localeNames[l]}
                </option>
              ))}
            </Select>
            <Select label={t("level")} name="level" defaultValue={defaults.level}>
              {(["beginner", "intermediate", "advanced"] as const).map((l) => (
                <option key={l} value={l}>
                  {ts(`level_${l}`)}
                </option>
              ))}
            </Select>
          </div>
          <TextArea
            label={t("notes")}
            name="notes"
            rows={3}
            maxLength={500}
            hint={t("notesHint")}
            error={state?.field === "notes" ? serverError : undefined}
            dir="auto"
          />
          {serverError && !state?.field && (
            <p className="subhead text-danger" role="alert">
              {serverError}
            </p>
          )}
          {state?.field === "file" && (
            <p className="subhead text-danger" role="alert">
              {serverError}
            </p>
          )}
          <Button
            type="submit"
            variant="primary"
            block
            busy={busy}
            aria-disabled={!ready && !(!limitReached && mode === "file" && upload.state === "uploading") ? true : undefined}
          >
            {waiting ? t("waitingUpload") : pending ? t("starting") : t("generate")}
          </Button>
          <p className="footnote text-center text-ink-muted">
            {mode === "file" ? t("startsAfterUpload") : t("pasteStarts")} {t("left", { count: generationsLeft })}
          </p>
        </Card>
      </div>
    </form>
  );
}

// "Choose file" looks like a button but the whole drop area is the control (one focus stop).
const buttonLike = "cc-btn cc-btn--secondary pointer-events-none mt-1";
