import { Router } from "express";
import type { SubscriptionService } from "../../services/subscriptionService";
import { config } from "../../config";

export interface GraphNotification {
  subscriptionId: string;
  clientState?: string;
  changeType?: string;
  resource?: string;
}

export function createGraphWebhookController(
  subscriptionService: SubscriptionService,
  onCalendarChange: (userId: string) => Promise<void>
): Router {
  const router = Router();

  router.post("/webhooks/graph", async (req, res) => {
    const validationToken = req.query.validationToken?.toString();
    if (validationToken) {
      return res.status(200).send(validationToken);
    }

    const notifications = (req.body?.value ?? []) as GraphNotification[];

    for (const notification of notifications) {
      if (notification.clientState !== config.graphWebhookClientState) {
        continue;
      }

      const subscription = await subscriptionService.getBySubscriptionId(notification.subscriptionId);
      if (!subscription) {
        continue;
      }

      await onCalendarChange(subscription.userId);
    }

    return res.status(202).json({ accepted: true });
  });

  return router;
}
