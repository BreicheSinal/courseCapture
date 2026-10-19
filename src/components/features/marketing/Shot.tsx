import sizes from "../../../../public/marketing/sizes.json";
import { cn } from "@/lib/utils/cn";

export type ShotName = keyof typeof sizes;

/**
 * A captured app screen (public/marketing/, built by `pnpm media`), in the
 * page's theme. Both themes are in the markup; CSS hides one, and because the
 * images are lazy the hidden one is never downloaded.
 */
export function Shot({ name, alt, className }: { name: ShotName; alt: string; className?: string }) {
  const { width, height } = sizes[name];
  return (
    <>
      {(["light", "dark"] as const).map((theme) => (
        // Plain <img>: already sized WebP, and next/image would re-encode animated files.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={theme}
          src={`/marketing/${theme}/${name}.webp`}
          width={width}
          height={height}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn(`cc-mk-${theme}`, className)}
        />
      ))}
    </>
  );
}

export const shotSize = (name: ShotName) => sizes[name];
