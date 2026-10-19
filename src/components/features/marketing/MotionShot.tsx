"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";
import sizes from "../../../../public/marketing/sizes.json";

type Props = {
  /** `create` or `learn`: public/marketing/{theme}/{name}.webp and {name}-poster.webp. */
  name: "create" | "learn";
  alt: string;
  posterAlt: string;
};

/**
 * A screen recording of a flow, as an animated image in the page's theme.
 * People who prefer reduced motion get a still; everyone else can pause it
 * (WCAG 2.2.2: anything that moves for more than five seconds can be paused).
 */
export function MotionShot({ name, alt, posterAlt }: Props) {
  const t = useTranslations("marketing.motion");
  const [paused, setPaused] = useState(false);
  const { width, height } = sizes[name];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="cc-mk-phone w-full">
        {(["light", "dark"] as const).map((theme) => {
          const poster = `/marketing/${theme}/${name}-poster.webp`;
          return (
            <picture key={theme} className={`cc-mk-${theme}`}>
              <source media="(prefers-reduced-motion: reduce)" srcSet={poster} />
              <img
                src={paused ? poster : `/marketing/${theme}/${name}.webp`}
                width={width}
                height={height}
                alt={paused ? posterAlt : alt}
                loading="lazy"
                decoding="async"
              />
            </picture>
          );
        })}
      </div>
      <button
        type="button"
        className={`${buttonClasses({ variant: "tertiary" })} cc-mk-motion-toggle`}
        aria-pressed={paused}
        onClick={() => setPaused((p) => !p)}
      >
        {t("pause")}
      </button>
    </div>
  );
}
