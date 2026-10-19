import { Suspense } from "react";
import { guard } from "@/lib/auth/session";
import { Splash } from "@/components/features/auth/Splash";

/**
 * `/app` sends everyone where they belong: sign-in, onboarding or their home.
 * The installed app opens here and sign-in links land here; `/` is the public
 * marketing page (#58).
 */
export default function Page() {
  return (
    <Suspense fallback={<Splash />}>
      <Dispatch />
    </Suspense>
  );
}

async function Dispatch() {
  await guard("app"); // always redirects
  return <Splash />;
}
