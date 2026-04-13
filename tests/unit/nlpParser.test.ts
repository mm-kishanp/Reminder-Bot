import { DateTime } from "luxon";
import { parseReminderInput } from "../../src/utils/nlpParser";

describe("nlpParser", () => {
  test("parses weekly reminder", () => {
    const now = DateTime.fromISO("2026-04-13T10:00:00", { zone: "UTC" });
    const parsed = parseReminderInput(
      "Remind me every Monday at 5 PM to review metrics",
      "UTC",
      now
    );

    expect(parsed.rrule).toBeDefined();
    expect(parsed.message).toContain("review metrics");
    expect(parsed.nextRunAt).toBeTruthy();
  });

  test("parses monthly reminder", () => {
    const parsed = parseReminderInput(
      "Remind me on the 1st of every month at 09:00 to pay rent",
      "UTC"
    );

    expect(parsed.rrule).toContain("FREQ=MONTHLY");
    expect(parsed.message).toContain("pay rent");
  });

  test("parses one-off reminder", () => {
    const parsed = parseReminderInput("Remind me at 5 PM to call John", "UTC");

    expect(parsed.oneOffAt).toBeDefined();
    expect(parsed.rrule).toBeUndefined();
  });

  test("parses weekday reminder", () => {
    const parsed = parseReminderInput("Remind me every weekday at 08:30 to check email", "UTC");

    expect(parsed.rrule).toContain("FREQ=DAILY");
    expect(parsed.message).toContain("check email");
  });

  test("parses daily reminder", () => {
    const parsed = parseReminderInput("Remind me daily at 18:00 to close tasks", "UTC");

    expect(parsed.rrule).toContain("FREQ=DAILY");
    expect(parsed.message).toContain("close tasks");
  });

  test("parses quoted one-off syntax", () => {
    const parsed = parseReminderInput('"Send newsletter" in 20 minutes', "UTC");

    expect(parsed.message).toBe("Send newsletter");
    expect(parsed.oneOffAt).toBeDefined();
  });

  test("parses timezone suffix", () => {
    const parsed = parseReminderInput('"Standup meeting" at 3:30pm IST', "UTC");

    expect(parsed.timezone).toBe("Asia/Kolkata");
  });

  test("parses multiple weekdays recurrence", () => {
    const parsed = parseReminderInput(
      '"update server" every Monday, Wednesday, Saturday at 10am',
      "UTC"
    );

    expect(parsed.rrule).toContain("FREQ=WEEKLY");
    expect(parsed.rrule).toContain("BYDAY=MO,WE,SA");
  });

  test("parses last-day monthly recurrence", () => {
    const parsed = parseReminderInput('"turn in all reports" on the last day of every month', "UTC");

    expect(parsed.rrule).toContain("FREQ=MONTHLY");
    expect(parsed.rrule).toContain("BYMONTHDAY=-1");
  });

  test("throws on invalid text", () => {
    expect(() => parseReminderInput("Completely invalid text", "UTC")).toThrow(
      "Unable to parse reminder"
    );
  });
});
