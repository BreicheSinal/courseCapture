import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/Icon";

/**
 * "You're offline" notice for signed-in screens (#37). Rendered on the server and
 * hidden by CSS; the inline `offlineScript` (root layout) shows it while the device
 * is offline. No React needed, so it works on a page saved for offline reading
 * even if its scripts can't load.
 */
export async function OfflineNotice() {
  const t = await getTranslations("offline");
  return (
    <p role="status" className="cc-offline-notice cc-notice cc-notice--warning subhead mb-4">
      <Icon name="alert" />
      <span>{t("banner")}</span>
    </p>
  );
}

/** Sets `data-offline` on <html> while the device is offline. Runs before paint, without React. */
export const offlineScript = `(function(){var h=document.documentElement;function u(){if(navigator.onLine)h.removeAttribute("data-offline");else h.setAttribute("data-offline","")}u();addEventListener("online",u);addEventListener("offline",u)})();`;
