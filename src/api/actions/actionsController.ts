import { Router } from "express";
import type { MessageHandlers } from "../../bot/messageHandlers";

export function createActionsController(handlers: MessageHandlers): Router {
  const router = Router();

  router.post("/actions/snooze", async (req, res) => {
    const { reminderId, minutes = 10 } = req.body;
    if (!reminderId) {
      return res.status(400).json({ error: "reminderId is required" });
    }

    const updated = await handlers.snoozeReminder(String(reminderId), Number(minutes));
    if (!updated) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    return res.json(updated);
  });

  router.post("/actions/dismiss", async (req, res) => {
    const { reminderId } = req.body;
    if (!reminderId) {
      return res.status(400).json({ error: "reminderId is required" });
    }

    const updated = await handlers.dismissReminder(String(reminderId));
    if (!updated) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    return res.json(updated);
  });

  return router;
}
