import type { Container } from "@azure/cosmos";
import { CosmosClient } from "@azure/cosmos";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config";
import type { Reminder, ReminderCreateInput, ReminderUpdateInput } from "../models/reminder";

export class ReminderService {
  private readonly container?: Container;
  private readonly memoryStore = new Map<string, Reminder>();

  constructor() {
    if (config.cosmosConnection) {
      const client = new CosmosClient(config.cosmosConnection);
      this.container = client
        .database(config.cosmosDatabase)
        .container(config.cosmosReminderContainer);
    }
  }

  async create(input: ReminderCreateInput): Promise<Reminder> {
    const reminder: Reminder = {
      id: uuidv4(),
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...input
    };

    if (this.container) {
      await this.container.items.create(reminder);
      return reminder;
    }

    this.memoryStore.set(reminder.id, reminder);
    return reminder;
  }

  async listByUser(userId: string): Promise<Reminder[]> {
    if (this.container) {
      const { resources } = await this.container.items
        .query<Reminder>({
          query: "SELECT * FROM c WHERE c.userId = @userId AND c.status = 'active' ORDER BY c.nextRunAt",
          parameters: [{ name: "@userId", value: userId }]
        })
        .fetchAll();

      return resources;
    }

    return [...this.memoryStore.values()]
      .filter((r) => r.userId === userId && r.status === "active")
      .sort((a, b) => a.nextRunAt.localeCompare(b.nextRunAt));
  }

  async listDue(cutoffIso: string): Promise<Reminder[]> {
    if (this.container) {
      const { resources } = await this.container.items
        .query<Reminder>({
          query: "SELECT * FROM c WHERE c.status = 'active' AND c.nextRunAt <= @cutoff",
          parameters: [{ name: "@cutoff", value: cutoffIso }]
        })
        .fetchAll();

      return resources;
    }

    return [...this.memoryStore.values()].filter(
      (r) => r.status === "active" && r.nextRunAt <= cutoffIso
    );
  }

  async getById(reminderId: string): Promise<Reminder | null> {
    if (this.container) {
      const { resources } = await this.container.items
        .query<Reminder>({
          query: "SELECT * FROM c WHERE c.id = @id",
          parameters: [{ name: "@id", value: reminderId }]
        })
        .fetchAll();

      return resources[0] ?? null;
    }

    return this.memoryStore.get(reminderId) ?? null;
  }

  async update(reminderId: string, input: ReminderUpdateInput): Promise<Reminder | null> {
    const existing = await this.getById(reminderId);
    if (!existing) {
      return null;
    }

    const updated: Reminder = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString()
    };

    if (this.container) {
      await this.container.item(reminderId, existing.userId).replace(updated);
      return updated;
    }

    this.memoryStore.set(reminderId, updated);
    return updated;
  }

  async delete(reminderId: string): Promise<boolean> {
    const existing = await this.getById(reminderId);
    if (!existing) {
      return false;
    }

    if (this.container) {
      await this.container.item(reminderId, existing.userId).delete();
      return true;
    }

    return this.memoryStore.delete(reminderId);
  }
}
