import type {
  BotFrameworkAdapter,
  ConversationReference} from "botbuilder";
import {
  CardFactory,
  TeamsActivityHandler,
  TurnContext
} from "botbuilder";
import { config } from "../config";
import type { Reminder } from "../models/reminder";
import type { MessageHandlers } from "./messageHandlers";
import type { ConversationReferenceService } from "../services/conversationReferenceService";
import type { ReminderDispatcher } from "../services/schedulerService";
import { formatInTimezone, timezoneFromLocale } from "../utils/timezone";

export class TeamsReminderBot extends TeamsActivityHandler implements ReminderDispatcher {
  constructor(
    private readonly adapter: BotFrameworkAdapter,
    private readonly messageHandlers: MessageHandlers,
    private readonly conversationReferenceService: ConversationReferenceService
  ) {
    super();

    this.onMessage(async (context, next) => {
      const userId = context.activity.from?.aadObjectId ?? context.activity.from?.id ?? "unknown";
      const timezone = timezoneFromLocale(context.activity.locale);
      const reference = TurnContext.getConversationReference(context.activity) as ConversationReference;
      const scope = context.activity.conversation.conversationType === "channel" ? "channel" : "personal";

      const conversationReferenceId = await this.conversationReferenceService.save(
        userId,
        reference,
        scope
      );

      const text = TurnContext.removeRecipientMention(context.activity)?.trim() ??
        context.activity.text ??
        "";

      const response = await this.messageHandlers.handleIncomingText(
        userId,
        conversationReferenceId,
        timezone,
        text
      );

      await context.sendActivity(response);
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      await context.sendActivity(
        "I can create and manage reminders. Say: Remind me every Monday at 5 PM to review metrics"
      );
      await next();
    });

    this.onInvokeActivity = async (context): Promise<{ status: number }> => {
      const value = context.activity.value as {
        action?: "snooze" | "dismiss";
        reminderId?: string;
        snoozeMinutes?: number;
      };

      if (!value?.action || !value.reminderId) {
        return { status: 200 };
      }

      if (value.action === "snooze") {
        const updated = await this.messageHandlers.snoozeReminder(
          value.reminderId,
          value.snoozeMinutes ?? 10
        );
        await context.sendActivity(
          updated
            ? `Snoozed until ${formatInTimezone(updated.nextRunAt, updated.timezone)}`
            : "Reminder not found."
        );
      }

      if (value.action === "dismiss") {
        await this.messageHandlers.dismissReminder(value.reminderId);
        await context.sendActivity("Reminder dismissed.");
      }

      return { status: 200 };
    };
  }

  async dispatchReminder(reminder: Reminder): Promise<void> {
    const refEntity = await this.conversationReferenceService.getById(reminder.conversationReferenceId);
    if (!refEntity) {
      return;
    }

    const card = buildReminderCard(reminder);
    await this.sendProactive(refEntity.reference, `Reminder: ${reminder.message}`, card);
  }

  async sendProactive(reference: ConversationReference, text: string, card?: Record<string, unknown>): Promise<void> {
    await this.adapter.continueConversationAsync(config.botAppId, reference, async (turnContext) => {
      if (card) {
        await turnContext.sendActivity({
          text,
          attachments: [CardFactory.adaptiveCard(card)]
        });
      } else {
        await turnContext.sendActivity(text);
      }
    });
  }
}

function buildReminderCard(reminder: Reminder): Record<string, unknown> {
  return {
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        weight: "Bolder",
        size: "Medium",
        text: "Reminder"
      },
      {
        type: "TextBlock",
        text: reminder.message,
        wrap: true
      },
      {
        type: "TextBlock",
        text: `Scheduled: ${formatInTimezone(reminder.nextRunAt, reminder.timezone)} (${reminder.timezone})`,
        isSubtle: true,
        wrap: true
      }
    ],
    actions: [
      {
        type: "Action.OpenUrl",
        title: "Join",
        url: "https://teams.microsoft.com"
      },
      {
        type: "Action.Submit",
        title: "Snooze 10 min",
        data: {
          action: "snooze",
          reminderId: reminder.id,
          snoozeMinutes: 10
        }
      },
      {
        type: "Action.Submit",
        title: "Dismiss",
        data: {
          action: "dismiss",
          reminderId: reminder.id
        }
      }
    ]
  };
}
