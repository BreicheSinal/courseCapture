import { ComingSoon } from "@/components/features/home/ComingSoon";
import { getSession } from "@/lib/auth/session";

/** Student home. Stage 4 replaces this with S2 Home. */
export default async function Page() {
  const session = await getSession(); // already checked by the layout
  return <ComingSoon role="student" name={session?.profile.full_name || session?.email || ""} />;
}
