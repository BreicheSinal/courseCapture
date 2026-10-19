import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/Icon";

/**
 * "You're offline" notice for signed-in screens (#37). Rendered on the server; the
 * inline `offlineScript` (root layout) shows it while the device is offline. No
 * React needed, so it works on a page saved for offline reading.
 *
 * The live region is always in the page and only its content is shown or hidden,
 * so screen readers announce it when the connection drops. Students are told
 * what still works (opened modules are saved); teachers and admins aren't, since
 * their pages are never saved.
 */
export async function OfflineNotice({ student }: { student: boolean }) {
  const t = await getTranslations("offline");
  return (
    <div role="status">
      <p className="cc-offline-notice cc-notice cc-notice--warning subhead mb-4">
        <Icon name="alert" />
        <span>{student ? t("banner") : t("bannerStaff")}</span>
      </p>
    </div>
  );
}

/** Sets `data-offline` on <html> while the device is offline. Runs before paint, without React. */
export const offlineScript = `(function(){var h=document.documentElement;function u(){if(navigator.onLine)h.removeAttribute("data-offline");else h.setAttribute("data-offline","")}u();addEventListener("online",u);addEventListener("offline",u)})();`;
