import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3978),
  botAppId: process.env.BOT_APP_ID ?? "",
  botAppPassword: process.env.BOT_APP_PASSWORD ?? "",
  cosmosConnection: process.env.AZURE_COSMOS_CONNECTION ?? "",
  cosmosDatabase: process.env.AZURE_COSMOS_DATABASE ?? "teams-reminder-bot",
  cosmosReminderContainer: process.env.AZURE_COSMOS_REMINDER_CONTAINER ?? "reminders",
  cosmosConversationContainer:
    process.env.AZURE_COSMOS_CONVERSATION_CONTAINER ?? "conversationRefs",
  cosmosSubscriptionContainer:
    process.env.AZURE_COSMOS_SUBSCRIPTION_CONTAINER ?? "subscriptions",
  graphClientId: process.env.GRAPH_CLIENT_ID ?? "",
  graphClientSecret: process.env.GRAPH_CLIENT_SECRET ?? "",
  graphTenantId: process.env.GRAPH_TENANT_ID ?? "",
  graphWebhookClientState: process.env.GRAPH_WEBHOOK_CLIENT_STATE ?? "replace-me",
  graphWebhookBaseUrl: process.env.GRAPH_WEBHOOK_BASE_URL ?? "",
  defaultReminderLeadMinutes: Number(process.env.DEFAULT_REMINDER_LEAD_MINUTES ?? 10),
  appInsightsKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY ?? "",
  keyVaultUri: process.env.KEY_VAULT_URI ?? ""
};

export const graphScopes = [
  "Calendars.Read",
  "offline_access",
  "openid",
  "profile",
  "User.Read"
];

export { required };
