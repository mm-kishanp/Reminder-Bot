import express from "express";
import request from "supertest";
import { createGraphWebhookController } from "../../src/api/webhooks/graphWebhook";

describe("graph webhook", () => {
  test("responds with validation token", async () => {
    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createGraphWebhookController(
        {
          getBySubscriptionId: jest.fn()
        } as any,
        jest.fn()
      )
    );

    const response = await request(app)
      .post("/api/webhooks/graph?validationToken=abc123")
      .send({});

    expect(response.status).toBe(200);
    expect(response.text).toBe("abc123");
  });

  test("processes graph notifications", async () => {
    const onCalendarChange = jest.fn().mockResolvedValue(undefined);
    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createGraphWebhookController(
        {
          getBySubscriptionId: jest.fn().mockResolvedValue({
            userId: "u1"
          })
        } as any,
        onCalendarChange
      )
    );

    const response = await request(app)
      .post("/api/webhooks/graph")
      .send({
        value: [
          {
            subscriptionId: "sub-1",
            clientState: "replace-me"
          }
        ]
      });

    expect(response.status).toBe(202);
    expect(onCalendarChange).toHaveBeenCalledWith("u1");
  });

  test("ignores notification with wrong clientState", async () => {
    const onCalendarChange = jest.fn().mockResolvedValue(undefined);
    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createGraphWebhookController(
        { getBySubscriptionId: jest.fn() } as any,
        onCalendarChange
      )
    );

    const response = await request(app)
      .post("/api/webhooks/graph")
      .send({
        value: [{ subscriptionId: "sub-1", clientState: "wrong-state" }]
      });

    expect(response.status).toBe(202);
    expect(onCalendarChange).not.toHaveBeenCalled();
  });

  test("ignores notification with no matching subscription", async () => {
    const onCalendarChange = jest.fn().mockResolvedValue(undefined);
    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createGraphWebhookController(
        { getBySubscriptionId: jest.fn().mockResolvedValue(null) } as any,
        onCalendarChange
      )
    );

    const response = await request(app)
      .post("/api/webhooks/graph")
      .send({
        value: [{ subscriptionId: "unknown-sub", clientState: "replace-me" }]
      });

    expect(response.status).toBe(202);
    expect(onCalendarChange).not.toHaveBeenCalled();
  });
});
