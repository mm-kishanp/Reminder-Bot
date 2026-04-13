# Teams Reminder Bot

A TypeScript Microsoft Teams bot that supports recurring reminders, Graph calendar notifications, and proactive nudges.

## Features

- Natural language reminders with recurring schedules.
- Proactive Teams reminders in personal and channel conversations.
- Graph calendar monitoring with configurable meeting nudges.
- Cosmos DB persistence for reminders, subscriptions, and conversation references.
- Azure deployment workflow with GitHub Actions.

## Bot usage patterns

The bot accepts both conversational and quoted reminder commands:

- `"Send newsletter" in 20 minutes`
- `"Call Jennie" at 3:45pm`
- `"Send report" at 13:15`
- `"Discuss current revenue numbers" on 13 March at 9am`
- `@Remind "Server maintenance" on Mar 31 at 8pm`
- `@Remind myself "check this again" on Monday at 9am`

Timezone suffixes are supported, for example:

- `"Standup meeting" at 3:30pm IST`
- `"Conf call" on 13 February at 10am GMT`

Recurring examples:

- `"attend the team meeting" every Tuesday at 11:00`
- `"daily standup meeting" every weekday at 10am IST`
- `"turn in expense reports" on the 25th day of every month`
- `"turn in all reports" on the last day of every month`
- `"update server" every Monday, Wednesday, Saturday at 10am`

Management commands:

- `list`
- `delete reminder #3`
- `complete reminder #2`
- `snooze this reminder for 10 minutes`

## Quick start

1. Copy `.env.example` to `.env` and populate values.
2. Install dependencies: `npm install`.
3. Run locally: `npm run dev`.
4. Expose endpoint for Graph webhook with ngrok (`npm run start:ngrok`).

## Required permissions

Delegated Graph permissions:

- `Calendars.Read`
- `offline_access`
- `openid`
- `profile`
- `User.Read`

## Endpoints

- `POST /api/messages`
- `POST /api/webhooks/graph`
- `POST /api/reminders`
- `GET /api/reminders?userId=...`
- `POST /api/actions/snooze`
- `POST /api/actions/dismiss`

## Deploy

Use [deploy/github-actions/ci-cd.yml](deploy/github-actions/ci-cd.yml) and configure repository secrets for Azure authentication.

## Troubleshooting

- Graph subscriptions require HTTPS callback URLs and a reachable endpoint.
- Ensure `GRAPH_WEBHOOK_BASE_URL` matches your public tunnel/host.
- If reminders are delayed, verify server UTC clock and stored IANA timezone.
