import type { ReactNode } from "react";

/**
 * Tags for `t.rich` (<n> name, <c> class, <k> code): names typed by people (classes, students) and codes are
 * isolated with <bdi>, so an English class name reads correctly inside an
 * Arabic sentence (docs/i18n.md).
 */
export const isolate = {
  n: (chunks: ReactNode) => <bdi>{chunks}</bdi>,
  c: (chunks: ReactNode) => <bdi>{chunks}</bdi>,
  k: (chunks: ReactNode) => (
    <bdi dir="ltr" className="font-semibold">
      {chunks}
    </bdi>
  ),
};
