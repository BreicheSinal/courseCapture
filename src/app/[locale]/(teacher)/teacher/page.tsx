import { ComingSoon } from "@/components/features/home/ComingSoon";
import { getSession } from "@/lib/auth/session";

/** Teacher home. Stage 3 replaces this with T8 first run / T10 class list. */
export default async function Page() {
  const session = await getSession(); // already checked by the layout
  return <ComingSoon role="teacher" name={session?.profile.full_name || session?.email || ""} />;
}
