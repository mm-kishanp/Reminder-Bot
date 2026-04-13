export type ReminderStatus = "active" | "dismissed";

export interface Reminder {
  id: string;
  userId: string;
  message: string;
  originalText: string;
  timezone: string;
  recurrenceText?: string;
  rrule?: string;
  oneOffAt?: string;
  nextRunAt: string;
  status: ReminderStatus;
  conversationReferenceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderCreateInput {
  userId: string;
  message: string;
  originalText: string;
  timezone: string;
  recurrenceText?: string;
  rrule?: string;
  oneOffAt?: string;
  nextRunAt: string;
  conversationReferenceId: string;
}

export interface ReminderUpdateInput {
  message?: string;
  recurrenceText?: string;
  rrule?: string;
  oneOffAt?: string;
  timezone?: string;
  nextRunAt?: string;
  status?: ReminderStatus;
}
