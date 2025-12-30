# 🎓 QuickEnglishLevelBot

A Telegram bot that assesses English language proficiency level (A1 to B2 based on CEFR) through vocabulary and grammar tests. Built with Node.js, featuring session-based storage and optional results forwarding to a monitoring bot.

## ✨ Features

- **Quick Assessment**: 20 multiple-choice questions covering vocabulary and grammar
- **CEFR Levels**: Determines your level from A1 (Beginner) to B2 (Upper-Intermediate)
- **Instant Results**: Get detailed breakdown by category and level
- **Session-Based**: No persistent data storage - privacy-friendly
- **Monitoring Bot**: Optional secondary bot to track all test results
- **Easy Customization**: Questions stored in JSON files for easy updates

## 📋 Requirements

- Node.js 16.0 or higher
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd quick-english-level-bot

# Install dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your bot token
nano .env  # or use your preferred editor
```

Set the following in your `.env` file:

```env
# Required
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

# Optional
SESSION_TIMEOUT_MINUTES=30
MONITOR_BOT_TOKEN=your_monitoring_bot_token
MONITOR_CHAT_ID=your_chat_id
```

### 3. Run the Bot

```bash
# Start the main assessment bot
npm start

# Or in development mode (auto-restart on changes)
npm run dev
```

## 🔧 Configuration

### Bot Token Setup

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow the prompts
3. Copy the API token provided
4. Paste it in your `.env` file as `TELEGRAM_BOT_TOKEN`

### Monitoring Bot (Optional)

To set up the monitoring bot for tracking results:

1. Create another bot via @BotFather
2. Add its token as `MONITOR_BOT_TOKEN`
3. Start the monitoring bot: `npm run start:monitor`
4. Send `/chatid` to get the chat ID
5. Add this ID as `MONITOR_CHAT_ID`
6. Restart the main bot

## 📁 Project Structure

```
/project-root
├── /src
│   ├── index.js              # Main bot entry point
│   ├── monitorBot.js         # Monitoring bot entry point
│   ├── /handlers
│   │   ├── commandHandlers.js    # Command handlers (/start, /restart, etc.)
│   │   └── callbackHandlers.js   # Inline keyboard handlers
│   ├── /services
│   │   ├── sessionService.js     # User session management
│   │   ├── questionService.js    # Question loading and selection
│   │   ├── assessmentService.js  # Scoring and level determination
│   │   └── monitoringService.js  # Results forwarding
│   └── /utils                # Utility functions
├── /data
│   ├── config.json           # Bot configuration
│   ├── questions.json        # Question bank
│   └── results.json          # Monitoring results (auto-created)
├── .env                      # Environment variables
├── .env.example              # Environment template
├── package.json
└── README.md
```

## 💬 Bot Commands

### Main Bot

| Command | Description |
|---------|-------------|
| `/start` | Begin a new assessment test |
| `/restart` | Restart the current test |
| `/cancel` | Cancel and clear current session |
| `/help` | Show help information |
| `/stats` | View bot statistics |

### Monitoring Bot

| Command | Description |
|---------|-------------|
| `/start` | Show bot information |
| `/chatid` | Get chat ID for configuration |
| `/stats` | View overall statistics |
| `/recent` | View last 10 test results |
| `/export` | Export all results as CSV |
| `/clear` | Clear all stored results |

## 📝 Customizing Questions

Edit `data/questions.json` to add, modify, or remove questions:

```json
{
  "questions": [
    {
      "id": 1,
      "text": "She ______ to school every day.",
      "options": ["go", "goes", "going", "went"],
      "correct": 1,
      "level": "A1",
      "category": "grammar",
      "weight": 1
    }
  ]
}
```

### Question Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique identifier |
| `text` | string | Question text |
| `options` | array | 4 answer options (indices 0-3) |
| `correct` | number | Index of correct answer (0-3) |
| `level` | string | CEFR level: A1, A2, B1, or B2 |
| `category` | string | "vocabulary" or "grammar" |
| `weight` | number | Score weight (optional, default based on level) |

## 📊 Scoring Algorithm

### Level Weights
- A1 questions: 1 point
- A2 questions: 2 points
- B1 questions: 3 points
- B2 questions: 4 points

### Level Determination
Based on weighted score percentage:
- 0-25%: A1 (Beginner)
- 26-50%: A2 (Elementary)
- 51-75%: B1 (Intermediate)
- 76-100%: B2 (Upper-Intermediate)

## 🔒 Privacy & Data

- **No persistent storage**: User data is stored in memory only
- **Session timeout**: Sessions automatically expire after 30 minutes of inactivity
- **Data cleared**: All user data is cleared after test completion or session expiry
- **Optional monitoring**: Results forwarding is entirely optional

## 🛠 Development

### Running in Development Mode

```bash
# Main bot with auto-restart
npm run dev

# Monitoring bot with auto-restart
npm run dev:monitor
```

### Running Both Bots

You can run both bots simultaneously in separate terminals:

```bash
# Terminal 1 - Main bot
npm start

# Terminal 2 - Monitoring bot
npm run start:monitor
```

## 🐛 Troubleshooting

### Common Issues

**Bot not responding:**
- Verify your `TELEGRAM_BOT_TOKEN` is correct
- Check if another instance is already running
- Ensure Node.js version is 16+

**Questions not loading:**
- Verify `data/questions.json` exists and is valid JSON
- Check console for parsing errors

**Monitoring not working:**
- Ensure both `MONITOR_BOT_TOKEN` and `MONITOR_CHAT_ID` are set
- Verify the monitoring bot is running
- Check that the chat ID is correct

### Debug Mode

For more verbose logging, you can check the console output for error messages and service status.

## 📄 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📬 Support

For issues and feature requests, please open an issue on GitHub.

---

Made with ❤️ for language learners everywhere.
