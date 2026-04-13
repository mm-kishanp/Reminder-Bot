import * as chrono from "chrono-node";
import { DateTime } from "luxon";
import type { Options, Weekday } from "rrule";
import { RRule } from "rrule";

export interface ParsedReminderInput {
  message: string;
  timezone: string;
  recurrenceText?: string;
  rrule?: string;
  oneOffAt?: string;
  nextRunAt: string;
}

const weekdayMap: Record<string, Weekday> = {
  monday: RRule.MO,
  tuesday: RRule.TU,
  wednesday: RRule.WE,
  thursday: RRule.TH,
  friday: RRule.FR,
  saturday: RRule.SA,
  sunday: RRule.SU
};

const timezoneAbbreviationMap: Record<string, string> = {
  utc: "UTC",
  gmt: "UTC",
  ist: "Asia/Kolkata",
  est: "America/New_York",
  edt: "America/New_York",
  cst: "America/Chicago",
  cdt: "America/Chicago",
  mst: "America/Denver",
  mdt: "America/Denver",
  pst: "America/Los_Angeles",
  pdt: "America/Los_Angeles",
  bst: "Europe/London"
};

export function parseReminderInput(
  text: string,
  timezone: string,
  now: DateTime<true> | DateTime<false> = DateTime.now()
): ParsedReminderInput {
  const commandParts = extractCommandParts(text);
  const tzInfo = extractTimezone(commandParts.whenText, timezone);
  const parsedTimezone = tzInfo.timezone;
  const whenText = tzInfo.whenText;
  const lower = whenText.toLowerCase();

  const everyWeekday = lower.match(/every\s+weekday(?:\s+at\s+(.+))?/i);
  if (everyWeekday) {
    const hm = extractHourMinute(everyWeekday[1] ?? "09:00");
    return buildRRuleReminder(commandParts.message, parsedTimezone, whenText, now, {
      freq: RRule.DAILY,
      byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
      byhour: [hm.hour],
      byminute: [hm.minute]
    });
  }

  const dailyAt = lower.match(/daily(?:\s+at\s+(.+))?/i);
  if (dailyAt) {
    const hm = extractHourMinute(dailyAt[1] ?? "09:00");
    return buildRRuleReminder(commandParts.message, parsedTimezone, whenText, now, {
      freq: RRule.DAILY,
      byhour: [hm.hour],
      byminute: [hm.minute]
    });
  }

  const weekdaysAt = lower.match(/every\s+([a-z,\s]+?)\s+at\s+(.+)/i);
  if (weekdaysAt) {
    const weekdayCandidates = weekdaysAt[1]
      .split(/,|and/)
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
    const mapped = weekdayCandidates.map((name) => weekdayMap[name]).filter(Boolean);

    if (mapped.length > 0 && mapped.length === weekdayCandidates.length) {
      const hm = extractHourMinute(weekdaysAt[2]);
      return buildRRuleReminder(commandParts.message, parsedTimezone, whenText, now, {
        freq: RRule.WEEKLY,
        byweekday: mapped,
        byhour: [hm.hour],
        byminute: [hm.minute]
      });
    }
  }

  const atTimeEveryWeekday = lower.match(
    /at\s+(.+?)\s+every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
  );
  if (atTimeEveryWeekday) {
    const weekday = weekdayMap[atTimeEveryWeekday[2].toLowerCase()];
    const hm = extractHourMinute(atTimeEveryWeekday[1]);
    return buildRRuleReminder(commandParts.message, parsedTimezone, whenText, now, {
      freq: RRule.WEEKLY,
      byweekday: [weekday],
      byhour: [hm.hour],
      byminute: [hm.minute]
    });
  }

  const monthlyDay = lower.match(
    /on\s+the\s+(\d{1,2})(st|nd|rd|th)?(?:\s+day)?\s+of\s+every\s+month(?:\s+at\s+(.+))?/i
  );
  if (monthlyDay) {
    const day = Number(monthlyDay[1]);
    const hm = extractHourMinute(monthlyDay[3] ?? "09:00");
    return buildRRuleReminder(commandParts.message, parsedTimezone, whenText, now, {
      freq: RRule.MONTHLY,
      bymonthday: [day],
      byhour: [hm.hour],
      byminute: [hm.minute]
    });
  }

  const lastDayMonthly = lower.match(/on\s+the\s+last\s+day\s+of\s+every\s+month(?:\s+at\s+(.+))?/i);
  if (lastDayMonthly) {
    const hm = extractHourMinute(lastDayMonthly[1] ?? "09:00");
    return buildRRuleReminder(commandParts.message, parsedTimezone, whenText, now, {
      freq: RRule.MONTHLY,
      bymonthday: [-1],
      byhour: [hm.hour],
      byminute: [hm.minute]
    });
  }

  const parsed = chrono.parseDate(whenText, now.setZone(parsedTimezone).toJSDate());
  if (!parsed) {
    throw new Error(
      "Unable to parse reminder date/time. Try examples like \"Send report\" at 13:15 or every Monday at 5 PM."
    );
  }

  const next = DateTime.fromJSDate(parsed).setZone(parsedTimezone);
  return {
    message: commandParts.message,
    timezone: parsedTimezone,
    oneOffAt: next.toUTC().toISO() ?? undefined,
    nextRunAt: next.toUTC().toISO() ?? ""
  };
}

function buildRRuleReminder(
  message: string,
  timezone: string,
  recurrenceText: string,
  now: DateTime,
  options: Partial<Options>
): ParsedReminderInput {
  const start = now.setZone(timezone).plus({ minutes: 1 }).startOf("minute");
  const rule = new RRule({
    dtstart: start.toJSDate(),
    interval: 1,
    tzid: timezone,
    ...options
  });

  const next = rule.after(start.minus({ seconds: 1 }).toJSDate(), true);
  if (!next) {
    throw new Error("Unable to compute next recurrence occurrence.");
  }

  return {
    message,
    timezone,
    recurrenceText,
    rrule: rule.toString(),
    nextRunAt: DateTime.fromJSDate(next).toUTC().toISO() ?? ""
  };
}

function extractHourMinute(raw: string): { hour: number; minute: number } {
  const parsed = chrono.parseDate(raw);
  if (!parsed) {
    return { hour: 9, minute: 0 };
  }

  const dt = DateTime.fromJSDate(parsed);
  return { hour: dt.hour, minute: dt.minute };
}

function extractCommandParts(text: string): { message: string; whenText: string } {
  const normalized = text.trim();
  const withoutPrefix = normalized
    .replace(/^@?remind(?:\s+me|\s+myself)?\s*/i, "")
    .trim();

  const quoted = withoutPrefix.match(/^"([^"]+)"\s+(.+)$/);
  if (quoted) {
    return {
      message: quoted[1].trim(),
      whenText: quoted[2].trim()
    };
  }

  const toIndex = withoutPrefix.toLowerCase().lastIndexOf(" to ");
  if (toIndex !== -1) {
    const whenText = withoutPrefix.slice(0, toIndex).trim();
    const message = withoutPrefix.slice(toIndex + 4).trim();

    return {
      message: message || "Reminder",
      whenText
    };
  }

  return {
    message: "Reminder",
    whenText: withoutPrefix
  };
}

function extractTimezone(whenText: string, fallbackTimezone: string): { timezone: string; whenText: string } {
  const match = whenText.match(/\b([A-Za-z]{2,4})$/);
  if (!match) {
    return {
      timezone: fallbackTimezone,
      whenText
    };
  }

  const token = match[1].toLowerCase();
  const mapped = timezoneAbbreviationMap[token];
  if (!mapped) {
    return {
      timezone: fallbackTimezone,
      whenText
    };
  }

  return {
    timezone: mapped,
    whenText: whenText.slice(0, match.index).trim()
  };
}
