const fs = require('fs');
const path = require('path');

/**
 * Command Handlers
 * Handles bot commands: /start, /restart, /cancel, /help, /stats
 */
class CommandHandlers {
  constructor(bot, sessionService, questionService, assessmentService, monitoringService) {
    this.bot = bot;
    this.sessionService = sessionService;
    this.questionService = questionService;
    this.assessmentService = assessmentService;
    this.monitoringService = monitoringService;
    this.config = this.loadConfig();
  }

  /**
   * Load configuration
   */
  loadConfig() {
    try {
      const configPath = path.join(__dirname, '../../data/config.json');
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading config in handlers:', error.message);
      return { bot: {}, test: { totalQuestions: 20 } };
    }
  }

  /**
   * Handle /start command
   * @param {Object} msg - Telegram message object
   */
  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;

    try {
      // Check if user has an active session
      if (this.sessionService.hasSession(userId)) {
        const session = this.sessionService.getSession(userId);
        if (session.state === 'in_progress') {
          await this.bot.sendMessage(chatId, 
            '⚠️ You have an active test in progress.\n\nUse /restart to start over or continue with the current test.',
            { parse_mode: 'Markdown' }
          );
          return;
        }
      }

      // Create new session
      this.sessionService.createSession(userId, username);

      // Send welcome message
      const welcomeMessage = this.config.bot.welcomeMessage || 
        '🎓 Welcome to QuickEnglishLevelBot!\n\nThis bot will assess your English proficiency level.';

      await this.bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📝 Start Test', callback_data: 'start_test' }],
            [{ text: 'ℹ️ Instructions', callback_data: 'show_instructions' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error in handleStart:', error);
      await this.bot.sendMessage(chatId, '❌ An error occurred. Please try again with /start');
    }
  }

  /**
   * Handle /restart command
   * @param {Object} msg - Telegram message object
   */
  async handleRestart(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;

    try {
      // Reset session
      this.sessionService.resetSession(userId, username);

      const restartMessage = this.config.bot.restartMessage || 
        '🔄 Test restarted. Let\'s begin again!';

      await this.bot.sendMessage(chatId, restartMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📝 Start Test', callback_data: 'start_test' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error in handleRestart:', error);
      await this.bot.sendMessage(chatId, '❌ An error occurred. Please try again with /start');
    }
  }

  /**
   * Handle /cancel command
   * @param {Object} msg - Telegram message object
   */
  async handleCancel(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      // Clear session
      this.sessionService.clearSession(userId);

      const cancelMessage = this.config.bot.cancelMessage || 
        '❌ Test cancelled. Your session has been cleared.\n\nUse /start to begin a new test.';

      await this.bot.sendMessage(chatId, cancelMessage, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in handleCancel:', error);
      await this.bot.sendMessage(chatId, '❌ An error occurred while cancelling.');
    }
  }

  /**
   * Handle /help command
   * @param {Object} msg - Telegram message object
   */
  async handleHelp(msg) {
    const chatId = msg.chat.id;

    const helpMessage = `📖 *QuickEnglishLevelBot Help*

*Available Commands:*
• /start - Begin a new assessment test
• /restart - Restart the current test
• /cancel - Cancel the current test
• /help - Show this help message

*About the Test:*
• ${this.config.test.totalQuestions || 20} multiple-choice questions
• Tests vocabulary and grammar
• Determines your level: A1, A2, B1, or B2
• Takes approximately 5-10 minutes

*Tips:*
• Read each question carefully
• Choose the best answer from the options
• You can restart anytime if needed
• Your data is not stored after the session ends

Need help? Contact the administrator.`;

    await this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  }

  /**
   * Handle /stats command (admin)
   * @param {Object} msg - Telegram message object
   */
  async handleStats(msg) {
    const chatId = msg.chat.id;

    try {
      const sessionStats = this.sessionService.getStats();
      const questionStats = this.questionService.getStats();

      let statsMessage = `📊 *Bot Statistics*\n\n`;
      statsMessage += `*Active Sessions:*\n`;
      statsMessage += `• Total: ${sessionStats.totalActive}\n`;
      statsMessage += `• In Progress: ${sessionStats.inProgress}\n`;
      statsMessage += `• Ready: ${sessionStats.ready}\n`;
      statsMessage += `• Completed: ${sessionStats.completed}\n\n`;
      statsMessage += `*Questions:*\n`;
      statsMessage += `• Total: ${questionStats.total}\n`;
      statsMessage += `• By Level: A1(${questionStats.byLevel.A1}), A2(${questionStats.byLevel.A2}), B1(${questionStats.byLevel.B1}), B2(${questionStats.byLevel.B2})\n`;
      statsMessage += `• By Category: Vocab(${questionStats.byCategory.vocabulary}), Grammar(${questionStats.byCategory.grammar})`;

      await this.bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in handleStats:', error);
      await this.bot.sendMessage(chatId, '❌ Error retrieving statistics.');
    }
  }

  /**
   * Register all command handlers
   */
  registerHandlers() {
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    this.bot.onText(/\/restart/, (msg) => this.handleRestart(msg));
    this.bot.onText(/\/cancel/, (msg) => this.handleCancel(msg));
    this.bot.onText(/\/help/, (msg) => this.handleHelp(msg));
    this.bot.onText(/\/stats/, (msg) => this.handleStats(msg));
  }
}

module.exports = CommandHandlers;
