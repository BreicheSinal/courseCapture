/**
 * The design system's Cover motif (design-system/components/Cover): one strip of
 * unequal rounded bands bleeding off the top of the page, with pills that read as
 * module progress. Decorative, so hidden from assistive tech. Mirrors in RTL.
 */
export function CoverBands() {
  const pills = (x0: number, y: number, n: number, cls: string, dimFrom = n) =>
    Array.from({ length: n }, (_, i) => (
      <rect key={`${x0}-${i}`} className={`${cls}${i >= dimFrom ? " dim" : ""}`} x={x0 + i * 36} y={y} width="28" height="14" rx="7" />
    ));
  return (
    <svg className="cc-mk-bands" viewBox="0 0 960 112" preserveAspectRatio="xMinYMin slice" aria-hidden="true" focusable="false">
      <rect className="accent" x="-20" y="-20" width="420" height="132" rx="20" />
      <rect className="ink" x="416" y="-20" width="204" height="112" rx="20" />
      <rect className="soft" x="636" y="-20" width="124" height="104" rx="20" />
      <rect className="ok" x="776" y="-20" width="80" height="92" rx="20" />
      <rect className="warn" x="872" y="-20" width="108" height="76" rx="20" />
      {pills(28, 70, 9, "cut", 6)}
      {pills(436, 62, 3, "accent")}
      {pills(652, 58, 2, "accent")}
    </svg>
  );
}
