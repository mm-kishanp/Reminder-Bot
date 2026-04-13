import type { Container } from "@azure/cosmos";
import { CosmosClient } from "@azure/cosmos";
import { config } from "../config";
import type { GraphSubscriptionEntity } from "../models/user";
import type { GraphClientService } from "./graphClient";

export class SubscriptionService {
  private readonly container?: Container;
  private readonly graphClient: GraphClientService;
  private readonly memoryStore = new Map<string, GraphSubscriptionEntity>();

  constructor(graphClient: GraphClientService) {
    this.graphClient = graphClient;

    if (config.cosmosConnection) {
      const client = new CosmosClient(config.cosmosConnection);
      this.container = client
        .database(config.cosmosDatabase)
        .container(config.cosmosSubscriptionContainer);
    }
  }

  async createForUser(userId: string, accessToken: string): Promise<GraphSubscriptionEntity> {
    const subscription = await this.graphClient.createCalendarSubscription(accessToken);
    const entity: GraphSubscriptionEntity = {
      id: `${userId}:${subscription.id}`,
      userId,
      subscriptionId: subscription.id,
      resource: subscription.resource,
      expirationDateTime: subscription.expirationDateTime,
      clientState: subscription.clientState,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (this.container) {
      await this.container.items.upsert(entity);
    } else {
      this.memoryStore.set(entity.id, entity);
    }

    return entity;
  }

  async listByUser(userId: string): Promise<GraphSubscriptionEntity[]> {
    if (this.container) {
      const { resources } = await this.container.items
        .query<GraphSubscriptionEntity>({
          query: "SELECT * FROM c WHERE c.userId = @userId",
          parameters: [{ name: "@userId", value: userId }]
        })
        .fetchAll();

      return resources;
    }

    return [...this.memoryStore.values()].filter((s) => s.userId === userId);
  }

  async getBySubscriptionId(subscriptionId: string): Promise<GraphSubscriptionEntity | null> {
    if (this.container) {
      const { resources } = await this.container.items
        .query<GraphSubscriptionEntity>({
          query: "SELECT * FROM c WHERE c.subscriptionId = @subscriptionId",
          parameters: [{ name: "@subscriptionId", value: subscriptionId }]
        })
        .fetchAll();

      return resources[0] ?? null;
    }

    return (
      [...this.memoryStore.values()].find((s) => s.subscriptionId === subscriptionId) ?? null
    );
  }

  async renewExpiring(accessTokenByUserId: Record<string, string>): Promise<void> {
    const all = this.container
      ? (
          await this.container.items
            .query<GraphSubscriptionEntity>("SELECT * FROM c")
            .fetchAll()
        ).resources
      : [...this.memoryStore.values()];

    const threshold = Date.now() + 15 * 60 * 1000;

    for (const subscription of all) {
      if (new Date(subscription.expirationDateTime).getTime() > threshold) {
        continue;
      }

      const token = accessTokenByUserId[subscription.userId];
      if (!token) {
        continue;
      }

      const newExpiration = await this.graphClient.renewSubscription(
        token,
        subscription.subscriptionId
      );

      const updated: GraphSubscriptionEntity = {
        ...subscription,
        expirationDateTime: newExpiration,
        updatedAt: new Date().toISOString()
      };

      if (this.container) {
        await this.container.items.upsert(updated);
      } else {
        this.memoryStore.set(updated.id, updated);
      }
    }
  }
}
