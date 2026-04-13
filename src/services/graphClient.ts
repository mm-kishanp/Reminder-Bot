import { Client } from "@microsoft/microsoft-graph-client";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { config } from "../config";

export interface GraphEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone?: string };
  end?: { dateTime: string; timeZone?: string };
  organizer?: { emailAddress?: { name?: string } };
  onlineMeeting?: { joinUrl?: string };
  location?: { displayName?: string };
}

export class GraphClientService {
  private readonly msalClient?: ConfidentialClientApplication;

  constructor() {
    if (config.graphClientId && config.graphClientSecret && config.graphTenantId) {
      this.msalClient = new ConfidentialClientApplication({
        auth: {
          clientId: config.graphClientId,
          authority: `https://login.microsoftonline.com/${config.graphTenantId}`,
          clientSecret: config.graphClientSecret
        }
      });
    }
  }

  async createClientForUser(accessToken?: string): Promise<Client> {
    if (accessToken) {
      return Client.init({
        authProvider: (done) => done(null, accessToken)
      });
    }

    if (!this.msalClient) {
      throw new Error("Graph credentials are not configured.");
    }

    const result = await this.msalClient.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"]
    });

    if (!result?.accessToken) {
      throw new Error("Unable to get Graph token.");
    }

    return Client.init({
      authProvider: (done) => done(null, result.accessToken)
    });
  }

  async listUpcomingEvents(accessToken: string, minutesWindow = 60): Promise<GraphEvent[]> {
    const client = await this.createClientForUser(accessToken);
    const now = new Date();
    const end = new Date(now.getTime() + minutesWindow * 60 * 1000);

    const events = await client
      .api("/me/events")
      .query({
        $select: "id,subject,start,end,organizer,location,onlineMeeting",
        $orderby: "start/dateTime",
        $top: "50",
        $filter: `start/dateTime ge '${now.toISOString()}' and start/dateTime le '${end.toISOString()}'`
      })
      .get();

    return (events.value ?? []) as GraphEvent[];
  }

  async createCalendarSubscription(accessToken: string): Promise<{
    id: string;
    resource: string;
    expirationDateTime: string;
    clientState: string;
  }> {
    const client = await this.createClientForUser(accessToken);
    const expiration = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const subscription = await client.api("/subscriptions").post({
      changeType: "created,updated",
      notificationUrl: `${config.graphWebhookBaseUrl}/api/webhooks/graph`,
      resource: "me/events",
      expirationDateTime: expiration,
      clientState: config.graphWebhookClientState
    });

    return {
      id: subscription.id,
      resource: subscription.resource,
      expirationDateTime: subscription.expirationDateTime,
      clientState: subscription.clientState
    };
  }

  async renewSubscription(accessToken: string, subscriptionId: string): Promise<string> {
    const client = await this.createClientForUser(accessToken);
    const expiration = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const renewed = await client.api(`/subscriptions/${subscriptionId}`).patch({
      expirationDateTime: expiration
    });

    return renewed.expirationDateTime;
  }
}
