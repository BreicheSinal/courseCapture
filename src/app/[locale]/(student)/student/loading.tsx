import { useTranslations } from "next-intl";
import { Card, Skeleton } from "@/components/ui";

/** Canvas X4 · Loading for teacher screens: a title and card-shaped skeletons inside the shell. */
export default function Loading() {
  const t = useTranslations("common");
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <Skeleton shape="title" className="max-w-60" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} stack>
            <Skeleton className="max-w-40" />
            <Skeleton />
            <Skeleton shape="pill" />
          </Card>
        ))}
      </div>
      <p role="status" className="footnote text-center text-ink-muted">
        {t("loading")}
      </p>
    </div>
  );
}
