import { DateTime } from "luxon";
import { MessageHandlers } from "../../src/bot/messageHandlers";

describe("user stories", () => {
  test("creates recurring reminder from natural language", async () => {
    const created: any[] = [];
    const reminderService = {
      create: jest.fn().mockImplementation(async (input) => {
        const reminder = {
          id: "abc12345",
          status: "active",
          createdAt: DateTime.utc().toISO(),
          updatedAt: DateTime.utc().toISO(),
          ...input
        };
        created.push(reminder);
        return reminder;
      }),
      listByUser: jest.fn().mockResolvedValue([]),
      getById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as any;

    const handlers = new MessageHandlers(reminderService);

    const response = await handlers.handleIncomingText(
      "u1",
      "u1:personal",
      "UTC",
      "Remind me every Monday at 5 PM to review metrics"
    );

    expect(created[0].rrule).toBeDefined();
    expect(response).toContain("Reminder created");
  });

  test("snoozes reminder", async () => {
    const reminder = {
      id: "r1",
      userId: "u1",
      message: "Review metrics",
      originalText: "",
      timezone: "UTC",
      nextRunAt: DateTime.utc().plus({ minutes: 5 }).toISO(),
      status: "active",
      conversationReferenceId: "u1:personal",
      createdAt: DateTime.utc().toISO(),
      updatedAt: DateTime.utc().toISO()
    };

    const reminderService = {
      getById: jest.fn().mockResolvedValue(reminder),
      update: jest.fn().mockImplementation(async (_id, update) => ({ ...reminder, ...update }))
    } as any;

    const handlers = new MessageHandlers(reminderService);
    const updated = await handlers.snoozeReminder("r1", 10);

    expect(updated).toBeTruthy();
    expect(reminderService.update).toHaveBeenCalled();
  });

  test("supports @Remind quoted command", async () => {
    const created: any[] = [];
    const reminderService = {
      create: jest.fn().mockImplementation(async (input) => {
        const reminder = {
          id: "quoted001",
          status: "active",
          createdAt: DateTime.utc().toISO(),
          updatedAt: DateTime.utc().toISO(),
          ...input
        };
        created.push(reminder);
        return reminder;
      }),
      listByUser: jest.fn().mockResolvedValue([]),
      getById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as any;

    const handlers = new MessageHandlers(reminderService);
    const response = await handlers.handleIncomingText(
      "u1",
      "u1:channel",
      "UTC",
      '@Remind "Server maintenance" on Mar 31 at 8pm'
    );

    expect(created[0].message).toBe("Server maintenance");
    expect(response).toContain("Reminder created");
  });

  test("supports list command shorthand", async () => {
    const reminderService = {
      listByUser: jest.fn().mockResolvedValue([
        {
          id: "abc12345",
          userId: "u1",
          message: "Review metrics",
          originalText: "",
          timezone: "UTC",
          nextRunAt: DateTime.utc().plus({ hours: 1 }).toISO(),
          status: "active",
          conversationReferenceId: "u1:personal",
          createdAt: DateTime.utc().toISO(),
          updatedAt: DateTime.utc().toISO()
        }
      ])
    } as any;

    const handlers = new MessageHandlers(reminderService);
    const response = await handlers.handleIncomingText("u1", "u1:personal", "UTC", "list");

    expect(response).toContain("Your reminders:");
  });
});
