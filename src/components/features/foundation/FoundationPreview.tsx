import { useFormatter, useTranslations } from "next-intl";
import { AppShell } from "@/components/layout/AppShell";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  IconButton,
  LanguageSelect,
  Skeleton,
  ThemeSwitcher,
} from "@/components/ui";

const sampleDue = new Date(Date.UTC(2026, 10, 4));

/** Stage-1 check page: every foundation piece on one screen, in the real app shell. */
export function FoundationPreview() {
  const t = useTranslations("foundation");
  const format = useFormatter();
  const due = format.dateTime(sampleDue, { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <AppShell role="teacher" person={{ name: "Layla Haddad", role: "teacher" }}>
      <div className="flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="eyebrow text-accent-text">{t("eyebrow")}</p>
          <h1 className="large-title">{t("title")}</h1>
          <p className="body max-w-[60ch] text-ink-muted">{t("intro")}</p>
        </header>

        <Card as="section" stack aria-labelledby="prefs">
          <h2 id="prefs" className="headline">
            {t("preferences")}
          </h2>
          <div className="flex flex-wrap items-end gap-6">
            <ThemeSwitcher />
            <LanguageSelect className="w-56" />
          </div>
          <p className="footnote text-ink-muted">{t("preferencesHint")}</p>
        </Card>

        <Card as="section" stack aria-labelledby="buttons">
          <h2 id="buttons" className="headline">
            {t("buttons")}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">{t("primary")}</Button>
            <Button variant="secondary">{t("secondary")}</Button>
            <Button variant="tertiary">{t("tertiary")}</Button>
            <Button variant="ghost">{t("ghost")}</Button>
            <Button variant="danger">{t("danger")}</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" busy>
              {t("busy", { done: 2, total: 4 })}
            </Button>
            <Button variant="secondary">
              {t("secondary")}
              <Icon name="arrowForward" />
            </Button>
            <IconButton icon="copy" label={t("copyCode")} />
          </div>
        </Card>

        <Card as="section" stack aria-labelledby="badges">
          <h2 id="badges" className="headline">
            {t("badges")}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="info">Biology 101</Badge>
            <Badge variant="neutral">{t("draft")}</Badge>
            <Badge variant="success">{t("complete")}</Badge>
            <Badge variant="warning">{t("overdue")}</Badge>
            <Badge variant="danger">{t("failed")}</Badge>
          </div>
        </Card>

        <Card as="section" stack aria-labelledby="type">
          <h2 id="type" className="headline">
            {t("type")}
          </h2>
          <p className="large-title">{t("sampleTitle")}</p>
          <p className="headline">{t("sampleHeadline")}</p>
          <p className="body">{t("sampleBody")}</p>
          <p className="subhead text-ink-muted">{t("sampleMeta", { modules: 9, date: due })}</p>
          {/* Codes stay left-to-right inside RTL text, but the line still starts at the reading edge. */}
          <p className="join-code text-accent-text">
            <bdi dir="ltr">K7M2Q</bdi>
          </p>
        </Card>

        <Card as="section" stack aria-labelledby="states">
          <h2 id="states" className="headline">
            {t("states")}
          </h2>
          <EmptyState
            icon="courses"
            title={t("emptyTitle")}
            text={t("emptyText")}
            actions={<Button variant="primary">{t("emptyAction")}</Button>}
          />
          <div className="flex flex-col gap-3">
            <Skeleton shape="title" />
            <Skeleton />
            <Skeleton shape="block" />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
