import { SubscriptionService } from "../../src/services/subscriptionService";

describe("subscriptionService", () => {
  test("creates and fetches subscription in memory store", async () => {
    const graphClient = {
      createCalendarSubscription: jest.fn().mockResolvedValue({
        id: "sub-1",
        resource: "me/events",
        expirationDateTime: "2026-04-13T10:00:00.000Z",
        clientState: "replace-me"
      }),
      renewSubscription: jest.fn()
    } as any;

    const service = new SubscriptionService(graphClient);
    const created = await service.createForUser("u1", "token");
    const fetched = await service.getBySubscriptionId("sub-1");

    expect(created.subscriptionId).toBe("sub-1");
    expect(fetched?.userId).toBe("u1");
  });

  test("lists by user and renews expiring subscriptions", async () => {
    const graphClient = {
      createCalendarSubscription: jest.fn().mockResolvedValue({
        id: "sub-2",
        resource: "me/events",
        expirationDateTime: new Date(Date.now() + 60_000).toISOString(),
        clientState: "replace-me"
      }),
      renewSubscription: jest
        .fn()
        .mockResolvedValue(new Date(Date.now() + 3_600_000).toISOString())
    } as any;

    const service = new SubscriptionService(graphClient);
    await service.createForUser("u2", "token");

    const beforeRenew = await service.listByUser("u2");
    expect(beforeRenew.length).toBe(1);

    await service.renewExpiring({ u2: "token" });
    expect(graphClient.renewSubscription).toHaveBeenCalledWith("token", "sub-2");
  });

  test("renewExpiring skips subscription with no token", async () => {
    const graphClient = {
      createCalendarSubscription: jest.fn().mockResolvedValue({
        id: "sub-3",
        resource: "me/events",
        expirationDateTime: new Date(Date.now() + 60_000).toISOString(),
        clientState: "replace-me"
      }),
      renewSubscription: jest.fn()
    } as any;

    const service = new SubscriptionService(graphClient);
    await service.createForUser("u3", "token");

    // Pass empty token map — skip renewal
    await service.renewExpiring({});
    expect(graphClient.renewSubscription).not.toHaveBeenCalled();
  });

  test("getBySubscriptionId returns null for unknown id", async () => {
    const graphClient = {
      createCalendarSubscription: jest.fn(),
      renewSubscription: jest.fn()
    } as any;

    const service = new SubscriptionService(graphClient);
    const result = await service.getBySubscriptionId("does-not-exist");
    expect(result).toBeNull();
  });

  test("listByUser returns empty for unknown user", async () => {
    const graphClient = {
      createCalendarSubscription: jest.fn(),
      renewSubscription: jest.fn()
    } as any;

    const service = new SubscriptionService(graphClient);
    const items = await service.listByUser("nobody");
    expect(items).toHaveLength(0);
  });
});
