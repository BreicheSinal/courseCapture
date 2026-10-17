import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

/** Teacher home: the class list (T10), which shows first run (T8) when there are no classes. */
export default async function Page() {
  redirect({ href: "/teacher/classes", locale: await getLocale() });
}
