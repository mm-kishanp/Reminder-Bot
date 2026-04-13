import { DateTime } from "luxon";
import { Reminder } from "../models/reminder";
import { ReminderService } from "../services/reminderService";
import { parseReminderInput } from "../utils/nlpParser";
import { formatInTimezone } from "../utils/timezone";

export class MessageHandlers {
  constructor(private readonly reminderService: ReminderService) {}

  async handleIncomingText(
    userId: string,
    conversationReferenceId: string,
    timezone: string,
    text: string
  ): Promise<string> {
    const normalized = text.trim();
    const lower = normalized.toLowerCase();

    if (lower === "list" || lower === "list my reminders" || lower === "list reminders") {
      return this.listReminders(userId);
    }

    if (lower.startsWith("delete reminder #") || lower.startsWith("delete #")) {
      return this.deleteByDisplayIndex(userId, lower);
    }

    if (lower.startsWith("complete reminder #") || lower.startsWith("mark complete #")) {
      return this.completeByDisplayIndex(userId, lower);
    }

    if (lower.startsWith("update reminder #")) {
      return this.updateReminder(userId, normalized, timezone);
    }

    if (lower.startsWith("snooze this reminder for")) {
      return this.snoozeLatestReminder(userId, lower);
    }

    if (isReminderCommand(normalized)) {
      return this.createReminder(userId, conversationReferenceId, timezone, normalized);
    }

    return [
      "I can help with reminders.",
      "Try:",
      "- \"Send newsletter\" in 20 minutes",
      "- @Remind \"Server maintenance\" on Mar 31 at 8pm",
      "- \"daily standup meeting\" every weekday at 10am IST",
      "- list",
      "- delete reminder #3"
    ].join("\n");
  }

  async snoozeReminder(reminderId: string, minutes: number): Promise<Reminder | null> {
    const reminder = await this.reminderService.getById(reminderId);
    if (!reminder) {
      return null;
    }

    const nextRunAt = DateTime.utc().plus({ minutes }).toISO() ?? reminder.nextRunAt;
    return this.reminderService.update(reminder.id, { nextRunAt });
  }

  async dismissReminder(reminderId: string): Promise<Reminder | null> {
    return this.reminderService.update(reminderId, { status: "dismissed" });
  }

  private async createReminder(
    userId: string,
    conversationReferenceId: string,
    timezone: string,
    text: string
  ): Promise<string> {
    const parsed = parseReminderInput(text, timezone);
    const reminder = await this.reminderService.create({
      userId,
      message: parsed.message,
      originalText: text,
      timezone: parsed.timezone,
      recurrenceText: parsed.recurrenceText,
      rrule: parsed.rrule,
      oneOffAt: parsed.oneOffAt,
      nextRunAt: parsed.nextRunAt,
      conversationReferenceId
    });

    return [
      `Reminder created: #${reminder.id.slice(0, 8)} ${reminder.message}`,
      `Timezone: ${reminder.timezone}`,
      `Next run: ${formatInTimezone(reminder.nextRunAt, reminder.timezone)}`
    ].join("\n");
  }

  private async listReminders(userId: string): Promise<string> {
    const reminders = await this.reminderService.listByUser(userId);
    if (reminders.length === 0) {
      return "No active reminders found.";
    }

    const lines = reminders.map(
      (r, idx) =>
        `${idx + 1}. #${r.id.slice(0, 8)} ${r.message} | next: ${formatInTimezone(r.nextRunAt, r.timezone)}`
    );

    return ["Your reminders:", ...lines].join("\n");
  }

  private async deleteByDisplayIndex(userId: string, lower: string): Promise<string> {
    const match = lower.match(/(?:delete reminder|delete) #(\d+)/);
    if (!match) {
      return "Use format: Delete reminder #3";
    }

    const index = Number(match[1]) - 1;
    const reminders = await this.reminderService.listByUser(userId);
    const target = reminders[index];

    if (!target) {
      return "Reminder index not found.";
    }

    await this.reminderService.delete(target.id);
    return `Deleted reminder #${index + 1}.`;
  }

  private async completeByDisplayIndex(userId: string, lower: string): Promise<string> {
    const match = lower.match(/(?:complete reminder|mark complete) #(\d+)/);
    if (!match) {
      return "Use format: Complete reminder #2";
    }

    const index = Number(match[1]) - 1;
    const reminders = await this.reminderService.listByUser(userId);
    const target = reminders[index];

    if (!target) {
      return "Reminder index not found.";
    }

    await this.dismissReminder(target.id);
    return `Marked reminder #${index + 1} as complete.`;
  }

  private async updateReminder(userId: string, text: string, timezone: string): Promise<string> {
    const indexMatch = text.toLowerCase().match(/update reminder #(\d+)\s+(.*)/);
    if (!indexMatch) {
      return "Use format: Update reminder #2 every Monday at 6 PM to review metrics";
    }

    const index = Number(indexMatch[1]) - 1;
    const payload = indexMatch[2];
    const reminders = await this.reminderService.listByUser(userId);
    const target = reminders[index];

    if (!target) {
      return "Reminder index not found.";
    }

    const parsed = parseReminderInput(payload, timezone);
    await this.reminderService.update(target.id, {
      message: parsed.message,
      recurrenceText: parsed.recurrenceText,
      rrule: parsed.rrule,
      oneOffAt: parsed.oneOffAt,
      nextRunAt: parsed.nextRunAt,
      timezone: parsed.timezone
    });

    return `Updated reminder #${index + 1}. Next run: ${formatInTimezone(parsed.nextRunAt, parsed.timezone)}`;
  }

  private async snoozeLatestReminder(userId: string, lower: string): Promise<string> {
    const minutesMatch = lower.match(/for\s+(\d+)\s+minutes?/);
    if (!minutesMatch) {
      return "Use format: Snooze this reminder for 10 minutes";
    }

    const minutes = Number(minutesMatch[1]);
    const reminders = await this.reminderService.listByUser(userId);
    const latest = reminders[0];

    if (!latest) {
      return "No active reminders available to snooze.";
    }

    const updated = await this.snoozeReminder(latest.id, minutes);
    if (!updated) {
      return "Reminder not found.";
    }

    return `Snoozed reminder until ${formatInTimezone(updated.nextRunAt, updated.timezone)}.`;
  }
}

function isReminderCommand(text: string): boolean {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  return (
    lower.includes("remind me") ||
    lower.includes("@remind") ||
    lower.startsWith("remind ") ||
    /^"[^"]+"\s+/.test(trimmed)
  );
}
