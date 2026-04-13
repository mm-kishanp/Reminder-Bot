import { DateTime } from "luxon";

const localeToTimezone: Record<string, string> = {
  en_us: "America/New_York",
  en_gb: "Europe/London",
  en_in: "Asia/Kolkata",
  ja_jp: "Asia/Tokyo",
  de_de: "Europe/Berlin"
};

export function normalizeTimezone(tz?: string): string {
  const timezone = tz ?? "UTC";
  return DateTime.now().setZone(timezone).isValid ? timezone : "UTC";
}

export function timezoneFromLocale(locale?: string): string {
  if (!locale) {
    return "UTC";
  }

  return localeToTimezone[locale.toLowerCase()] ?? "UTC";
}

export function formatInTimezone(dateIso: string, timezone: string): string {
  return DateTime.fromISO(dateIso).setZone(normalizeTimezone(timezone)).toFormat("ff");
}
