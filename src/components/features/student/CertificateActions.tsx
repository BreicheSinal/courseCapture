"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { buildCertificatePdf, type CertificateLines } from "./certificatePdf";

async function fontBase64(file: string) {
  const res = await fetch(`/fonts/${file}`);
  if (!res.ok) throw new Error(`font ${file}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

const noop = () => () => {};

/** Save certificate (PDF) and Share (only where the device can share). */
export function CertificateActions({
  lines,
  file,
  shareText,
}: {
  lines: CertificateLines;
  file: string;
  shareText: string;
}) {
  const t = useTranslations("student.finish");
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const canShare = useSyncExternalStore(
    noop,
    () => typeof navigator.share === "function",
    () => false,
  );

  const save = async () => {
    setSaving(true);
    try {
      const doc = await buildCertificatePdf(lines, fontBase64);
      // Our own link so non-Latin file names (e.g. Arabic) are kept.
      const url = URL.createObjectURL(doc.output("blob"));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast(t("saved"), "success");
    } catch {
      toast(t("saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: lines.heading, text: shareText });
    } catch {
      // Cancelled by the person: nothing to say.
    }
  };

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Button variant="primary" onClick={save} busy={saving} className={canShare ? undefined : "sm:col-span-2"}>
        <Icon name="download" />
        {saving ? t("saving") : t("save")}
      </Button>
      {canShare && (
        <Button variant="secondary" onClick={share}>
          <Icon name="share" />
          {t("share")}
        </Button>
      )}
    </div>
  );
}
