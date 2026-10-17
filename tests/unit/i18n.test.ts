import { describe, expect, it } from "vitest";
import { getDirection, localeNames, locales } from "@/i18n/locales";
import { compareLocales } from "../../scripts/check-messages.mjs";

describe("locales", () => {
  it("has every locale's messages with the same keys as English", () => {
    expect(compareLocales()).toEqual([]);
  });

  it("uses right-to-left only for Arabic", () => {
    expect(locales.filter((l) => getDirection(l) === "rtl")).toEqual(["ar"]);
  });

  it("names every locale in its own language", () => {
    for (const l of locales) expect(localeNames[l]).toBeTruthy();
  });
});
