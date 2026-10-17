import { useTranslations } from "next-intl";
import { Card, Skeleton } from "@/components/ui";

/** Canvas X4 · Loading — skeletons in the shape of a typical page. */
export default function Loading() {
  const t = useTranslations("common");
  return (
    <div role="status" aria-label={t("loading")} className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <Skeleton shape="title" />
      <Card stack>
        <Skeleton />
        <Skeleton />
        <Skeleton shape="block" />
      </Card>
    </div>
  );
}
