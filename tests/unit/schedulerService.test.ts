import { DateTime } from "luxon";
import type { Reminder } from "../../src/models/reminder";
import { SchedulerService } from "../../src/services/schedulerService";

describe("schedulerService", () => {
  test("start and stop manage polling timer", () => {
    jest.useFakeTimers();

    const reminderService = {
      listDue: jest.fn().mockResolvedValue([]),
      update: jest.fn()
    } as any;

    const dispatcher = {
      dispatchReminder: jest.fn().mockResolvedValue(undefined)
    };

    const scheduler = new SchedulerService(reminderService, dispatcher);
    scheduler.start(1000);
    jest.advanceTimersByTime(2500);
    scheduler.stop();

    expect(reminderService.listDue).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test("dispatches due reminder and dismisses one-off", async () => {
    const reminder: Reminder = {
      id: "r1",
      userId: "u1",
      message: "Test",
      originalText: "Remind me",
      timezone: "UTC",
      nextRunAt: "2026-04-13T09:00:00.000Z",
      oneOffAt: "2026-04-13T09:00:00.000Z",
      status: "active",
      conversationReferenceId: "u1:personal",
      createdAt: "2026-04-13T08:00:00.000Z",
      updatedAt: "2026-04-13T08:00:00.000Z"
    };

    const updates: Array<{ id: string; payload: any }> = [];
    const reminderService = {
      listDue: jest.fn().mockResolvedValue([reminder]),
      update: jest.fn().mockImplementation(async (id: string, payload: any) => {
        updates.push({ id, payload });
      })
    } as any;

    const dispatcher = {
      dispatchReminder: jest.fn().mockResolvedValue(undefined)
    };

    const scheduler = new SchedulerService(reminderService, dispatcher);
    await scheduler.poll(DateTime.fromISO("2026-04-13T09:01:00.000Z"));

    expect(dispatcher.dispatchReminder).toHaveBeenCalledTimes(1);
    expect(updates[0].payload.status).toBe("dismissed");
  });

  test("dispatches recurring reminder and schedules next run", async () => {
    const reminder: Reminder = {
      id: "r2",
      userId: "u1",
      message: "Weekly review",
      originalText: "Remind me every Monday at 5 PM",
      timezone: "UTC",
      nextRunAt: "2026-04-13T09:00:00.000Z",
      rrule: "FREQ=WEEKLY;BYDAY=MO",
      status: "active",
      conversationReferenceId: "u1:personal",
      createdAt: "2026-04-13T08:00:00.000Z",
      updatedAt: "2026-04-13T08:00:00.000Z"
    };

    const updates: Array<{ id: string; payload: any }> = [];
    const reminderService = {
      listDue: jest.fn().mockResolvedValue([reminder]),
      update: jest.fn().mockImplementation(async (id: string, payload: any) => {
        updates.push({ id, payload });
      })
    } as any;

    const dispatcher = {
      dispatchReminder: jest.fn().mockResolvedValue(undefined)
    };

    const scheduler = new SchedulerService(reminderService, dispatcher);
    await scheduler.poll(DateTime.fromISO("2026-04-13T09:01:00.000Z"));

    expect(dispatcher.dispatchReminder).toHaveBeenCalledTimes(1);
    expect(updates[0].payload.nextRunAt).toBeDefined();
  });
});
