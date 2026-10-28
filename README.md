# Nexora Pairing

A JavaScript-based WhatsApp pairing service that provisions isolated Nexora instances, manages Telegram approval flow, and generates fresh pairing codes for users.

## Repository snapshot

- Repository: `sneakyuser5-netizen/nexora-pairing`
- Default branch: `main`
- Primary language: JavaScript
- Visibility: Public
- Archived: No
- Open issues: 0
- Forks: 0
- Stars: 0
- Watchers: 0
- Repository size: ~1,894 KB
- Last push: 2026-10-20T22:33:46Z

## What this repo does

This project acts as a pairing orchestration layer for Nexora instances:

- Starts a health server on port `3000`
- Maintains per-phone isolated instance directories under `instances/`
- Syncs the latest Nexora template from `whisperbot-template/`
- Creates WhatsApp auth/session storage for each pairing request
- Generates and manages new WhatsApp pairing codes via Telegram-triggered flows
- Uses Telegram as the control plane for user approval, pairing requests, and admin actions
- Validates and clears stale sessions when pairing fails or the bot logs out

## Project structure

```text
.
├── .env
├── .gitignore
├── README.md
├── bot-runtime.js
├── index.js
├── language.js
├── package.json
├── source-sync.js
├── telegram-approvals.js
├── database/
├── instances/
├── language/
├── whisperbot-template/
└── .whisperbot-template-sync.json
```

## Core files

- `index.js` — Telegram bot, pairing orchestration, WhatsApp lifecycle, reconnect logic
- `bot-runtime.js` — starts child Nexora runtime processes
- `source-sync.js` — copies/syncs the latest template into isolated instances
- `language.js` — Telegram language helpers and message translation
- `telegram-approvals.js` — approved Telegram user management
- `whisperbot-template/` — reusable Nexora source template used for fresh bot instances

## Runtime behavior

The service is designed around a pair-and-launch flow:

1. A user sends `/pair <phone>` in Telegram.
2. The repo validates the target phone and prepares an isolated instance.
3. It creates a temporary WhatsApp socket and requests a pairing code.
4. The user completes pairing in WhatsApp.
5. Once linked, the project launches the real Nexora instance for that phone.
6. Stale sessions are cleaned automatically on logout, timeout, or invalid session reuse.

## Tech stack

- Node.js
- JavaScript (CommonJS)
- Baileys (`@whiskeysockets/baileys`)
- Telegram Bot API
- dotenv
- pino logging
- QR/pairing code flow for WhatsApp

## Notes

- The repo currently has no open issues.
- There are no public forks, stars, or watchers at the moment.
- The project is configured around a public pairing service model and uses Telegram approvals to restrict access.

## Getting started

### Prerequisites

- Node.js 18+
- npm
- A Telegram bot token in `.env` via `TELEGRAM_BOT_TOKEN`

### Install

```bash
npm install
```

### Run

```bash
npm start
```

### Required environment variable

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

## License

No explicit license file is currently present in the repository root, so licensing status should be confirmed before production redistribution or public reuse.

## Maintainer

This repository is currently maintained under the GitHub account `sneakyuser5-netizen`.
