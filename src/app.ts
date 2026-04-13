import express from "express";
import {
  AutoSaveStateMiddleware,
  BotFrameworkAdapter,
  ConversationState,
  MemoryStorage,
  UserState
} from "botbuilder";
import { DateTime } from "luxon";
import { MessageHandlers } from "./bot/messageHandlers";
import { TeamsReminderBot } from "./bot/teamsBot";
import { config } from "./config";
import { createActionsController } from "./api/actions/actionsController";
import { createCommandsController } from "./api/commands/commandsController";
import { createGraphWebhookController } from "./api/webhooks/graphWebhook";
import { ConversationReferenceService } from "./services/conversationReferenceService";
import { GraphClientService } from "./services/graphClient";
import { ReminderService } from "./services/reminderService";
import { SchedulerService } from "./services/schedulerService";
import { SubscriptionService } from "./services/subscriptionService";

export interface AppServices {
  reminderService: ReminderService;
  handlers: MessageHandlers;
  scheduler: SchedulerService;
}

export function buildApp(): { app: express.Express; services: AppServices } {
  const app = express();
  app.use(express.json());

  const adapter = new BotFrameworkAdapter({
    appId: config.botAppId,
    appPassword: config.botAppPassword
  });

  const memoryStorage = new MemoryStorage();
  const conversationState = new ConversationState(memoryStorage);
  const userState = new UserState(memoryStorage);

  adapter.use(new AutoSaveStateMiddleware(conversationState, userState));

  adapter.onTurnError = async (context, error) => {
    console.error("bot error", error);
    await context.sendActivity("The bot encountered an error.");
  };

  const reminderService = new ReminderService();
  const conversationReferenceService = new ConversationReferenceService();
  const graphClient = new GraphClientService();
  const subscriptionService = new SubscriptionService(graphClient);
  const handlers = new MessageHandlers(reminderService);
  const bot = new TeamsReminderBot(adapter, handlers, conversationReferenceService);

  const scheduler = new SchedulerService(reminderService, bot);
  scheduler.start();

  app.post("/api/messages", (req, res) => {
    void adapter.processActivity(req, res, async (turnContext) => {
      await bot.run(turnContext);
    });
  });

  app.use("/api", createCommandsController(reminderService));
  app.use("/api", createActionsController(handlers));
  app.use(
    "/api",
    createGraphWebhookController(subscriptionService, async (userId) => {
      // In production, fetch delegated user token via OAuth token store/refresh token.
      const delegatedAccessToken = "";
      if (!delegatedAccessToken) {
        return;
      }

      const events = await graphClient.listUpcomingEvents(delegatedAccessToken, 180);

      for (const event of events) {
        const start = DateTime.fromISO(event.start.dateTime);
        const nudgeAt = start.minus({ minutes: config.defaultReminderLeadMinutes });
        if (nudgeAt <= DateTime.utc()) {
          continue;
        }

        await reminderService.create({
          userId,
          message: `Upcoming meeting: ${event.subject}`,
          originalText: `Graph event ${event.id}`,
          timezone: "UTC",
          oneOffAt: nudgeAt.toUTC().toISO() ?? undefined,
          nextRunAt: nudgeAt.toUTC().toISO() ?? new Date().toISOString(),
          conversationReferenceId: `${userId}:personal`
        });
      }
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  return {
    app,
    services: {
      reminderService,
      handlers,
      scheduler
    }
  };
}
