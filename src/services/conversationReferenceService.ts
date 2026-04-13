import type { Container } from "@azure/cosmos";
import { CosmosClient } from "@azure/cosmos";
import type { ConversationReference } from "botbuilder";
import { config } from "../config";
import type { ConversationReferenceEntity } from "../models/user";

export class ConversationReferenceService {
  private readonly container?: Container;
  private readonly memoryStore = new Map<string, ConversationReferenceEntity>();

  constructor() {
    if (config.cosmosConnection) {
      const client = new CosmosClient(config.cosmosConnection);
      this.container = client
        .database(config.cosmosDatabase)
        .container(config.cosmosConversationContainer);
    }
  }

  async save(userId: string, reference: ConversationReference, scope: "personal" | "channel"): Promise<string> {
    const id = `${userId}:${scope}`;
    const entity: ConversationReferenceEntity = {
      id,
      userId,
      reference,
      scope,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (this.container) {
      await this.container.items.upsert(entity);
    } else {
      this.memoryStore.set(id, entity);
    }

    return id;
  }

  async getById(id: string): Promise<ConversationReferenceEntity | null> {
    if (this.container) {
      const { resources } = await this.container.items
        .query<ConversationReferenceEntity>({
          query: "SELECT * FROM c WHERE c.id = @id",
          parameters: [{ name: "@id", value: id }]
        })
        .fetchAll();
      return resources[0] ?? null;
    }

    return this.memoryStore.get(id) ?? null;
  }
}
