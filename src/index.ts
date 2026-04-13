import { config } from "./config";
import { buildApp } from "./app";

const { app } = buildApp();

app.listen(config.port, () => {
  console.log(`Teams Reminder Bot listening on port ${config.port}`);
});
