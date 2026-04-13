import { Router } from "express";
import { ReminderService } from "../../services/reminderService";
import { parseReminderInput } from "../../utils/nlpParser";

export function createCommandsController(reminderService: ReminderService): Router {
  const router = Router();

  router.post("/reminders", async (req, res) => {
    const { userId, text, timezone = "UTC", conversationReferenceId } = req.body;

    if (!userId || !text || !conversationReferenceId) {
      return res.status(400).json({
        error: "userId, text, and conversationReferenceId are required"
      });
    }

    try {
      const parsed = parseReminderInput(String(text), String(timezone));
      const reminder = await reminderService.create({
        userId: String(userId),
        message: parsed.message,
        originalText: String(text),
        timezone: String(timezone),
        recurrenceText: parsed.recurrenceText,
        rrule: parsed.rrule,
        oneOffAt: parsed.oneOffAt,
        nextRunAt: parsed.nextRunAt,
        conversationReferenceId: String(conversationReferenceId)
      });

      return res.status(201).json(reminder);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  router.get("/reminders", async (req, res) => {
    const userId = req.query.userId?.toString();
    if (!userId) {
      return res.status(400).json({ error: "userId query parameter is required" });
    }

    const reminders = await reminderService.listByUser(userId);
    return res.json(reminders);
  });

  return router;
}
