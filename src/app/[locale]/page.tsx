import { Suspense } from "react";
import { guard } from "@/lib/auth/session";
import { Splash } from "@/components/features/auth/Splash";

/** `/` sends everyone where they belong: sign-in, onboarding or their home. */
export default function Page() {
  return (
    <Suspense fallback={<Splash />}>
      <Dispatch />
    </Suspense>
  );
}

async function Dispatch() {
  await guard("root"); // always redirects
  return <Splash />;
}
