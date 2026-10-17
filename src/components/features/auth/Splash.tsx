import { useTranslations } from "next-intl";

/** Canvas X6 · Splash: the wordmark centred while we work out where to send you. */
export function Splash() {
  const t = useTranslations("common");
  return (
    <div role="status" aria-label={t("loading")} className="grid min-h-dvh place-items-center">
      <p className="cc-wordmark cc-wordmark--lg" dir="ltr">
        Course<span>Capture</span>
      </p>
    </div>
  );
}
