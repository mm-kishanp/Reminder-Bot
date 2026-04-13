import { DateTime } from "luxon";
import { RRule } from "rrule";
import type { Reminder } from "../models/reminder";
import type { ReminderService } from "./reminderService";

export interface ReminderDispatcher {
  dispatchReminder(reminder: Reminder): Promise<void>;
}

export class SchedulerService {
  private readonly reminderService: ReminderService;
  private readonly dispatcher: ReminderDispatcher;
  private timer?: NodeJS.Timeout;

  constructor(reminderService: ReminderService, dispatcher: ReminderDispatcher) {
    this.reminderService = reminderService;
    this.dispatcher = dispatcher;
  }

  start(intervalMs = 60_000): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.poll().catch((error) => {
        console.error("scheduler poll failure", error);
      });
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async poll(now: DateTime<true> | DateTime<false> = DateTime.utc()): Promise<void> {
    const due = await this.reminderService.listDue(now.toISO() ?? new Date().toISOString());

    for (const reminder of due) {
      await this.dispatcher.dispatchReminder(reminder);
      const next = computeNextRun(reminder);

      if (!next) {
        await this.reminderService.update(reminder.id, { status: "dismissed" });
        continue;
      }

      await this.reminderService.update(reminder.id, { nextRunAt: next.toUTC().toISO() ?? reminder.nextRunAt });
    }
  }
}

export function computeNextRun(reminder: Reminder): DateTime | null {
  if (reminder.rrule) {
    const rule = RRule.fromString(reminder.rrule);
    const next = rule.after(new Date(reminder.nextRunAt));
    return next ? DateTime.fromJSDate(next) : null;
  }

  if (reminder.oneOffAt) {
    return null;
  }

  return null;
}
