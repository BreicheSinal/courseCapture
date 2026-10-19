import { cn } from "@/lib/utils/cn";

/**
 * Design-system DiagramFrame (design-system/components/DiagramFrame): an AI-drawn
 * diagram in its well, with an optional caption and AI label. The SVG must already
 * be sanitised (src/lib/svg/sanitize.ts); alt text is required.
 *
 * `DiagramWell` alone is the edit variant's well, for the module editor, where the
 * caption is a form field instead.
 */
export function DiagramWell({
  svg,
  alt,
  lang,
  edit = false,
  className,
}: {
  svg: string;
  alt: string;
  lang?: string;
  edit?: boolean;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={alt}
      lang={lang}
      className={cn("cc-diagram", edit && "cc-diagram--edit", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function DiagramFrame({
  svg,
  alt,
  caption,
  aiLabel,
  lang,
}: {
  svg: string;
  alt: string;
  caption?: string | null;
  aiLabel?: string;
  lang?: string;
}) {
  return (
    <figure className="cc-diagram-frame">
      <DiagramWell svg={svg} alt={alt} lang={lang} />
      {(caption || aiLabel) && (
        <figcaption>
          {caption && (
            <span className="cc-diagram-frame__caption" dir="auto" lang={lang}>
              {caption}
            </span>
          )}
          {aiLabel && <span className="cc-diagram-frame__ai">{aiLabel}</span>}
        </figcaption>
      )}
    </figure>
  );
}
