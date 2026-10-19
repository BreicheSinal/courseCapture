import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonClasses, type ButtonVariant } from "@/components/ui/Button";
import { getSession } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/routing";

type Props = { variant: ButtonVariant; size?: "md" | "lg" };

/**
 * "Sign in" for visitors; for signed-in people, a button to their home
 * ("Go to Classes"). The page stays prerendered: "Sign in" is in the static
 * shell and the signed-in button streams in (#58).
 */
export function AccountAction(props: Props) {
  return (
    <Suspense fallback={<SignIn {...props} />}>
      <Signed {...props} />
    </Suspense>
  );
}

function SignIn({ variant, size }: Props) {
  const t = useTranslations("marketing");
  return (
    <Link href="/sign-in" className={buttonClasses({ variant, size })}>
      {t("signIn")}
    </Link>
  );
}

async function Signed({ variant, size }: Props) {
  const session = await getSession();
  if (!session) return <SignIn variant={variant} size={size} />;
  const t = await getTranslations("marketing.account");
  const home = homeFor(session.profile);
  const label =
    home === "/teacher"
      ? t("teacher")
      : home === "/student"
        ? t("student")
        : home.startsWith("/admin")
          ? t("admin")
          : home === "/onboarding/pending"
            ? t("pending")
            : t("onboarding");
  return (
    <Link href={home} className={buttonClasses({ variant, size })}>
      {label}
    </Link>
  );
}
