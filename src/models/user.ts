import { ConversationReference } from "botbuilder";

export interface UserProfile {
  id: string;
  timezone: string;
  leadMinutes: number;
  calendarOptIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationReferenceEntity {
  id: string;
  userId: string;
  reference: ConversationReference;
  scope: "personal" | "channel";
  createdAt: string;
  updatedAt: string;
}

export interface GraphSubscriptionEntity {
  id: string;
  userId: string;
  subscriptionId: string;
  resource: string;
  expirationDateTime: string;
  clientState: string;
  createdAt: string;
  updatedAt: string;
}
