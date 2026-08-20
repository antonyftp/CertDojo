import "server-only";

import { cookies } from "next/headers";

// Theme preference (SPECIFICATIONS.md §6.1). Kept server-side in a cookie
// rather than localStorage so the correct palette is present in the first
// paint and the control works without JavaScript — see the "theme control"
// amendment in DESIGN.md for the reasoning.

export const THEME_COOKIE = "certdojo-theme";

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

export async function getThemePreference(): Promise<ThemePreference> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;

  // Anything unexpected (hand-edited cookie, an older format) falls back to
  // following the operating system, which is the app's original behaviour.
  return isThemePreference(value) ? value : "system";
}

// "system" writes no attribute at all: that is what lets the stylesheet's
// `color-scheme: light dark` follow the OS.
export function themeAttribute(
  preference: ThemePreference,
): "light" | "dark" | undefined {
  return preference === "system" ? undefined : preference;
}
