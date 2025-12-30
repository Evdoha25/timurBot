const TelegramBot = require('node-telegram-bot-api');

/**
 * Monitoring Service
 * Forwards test results to a monitoring bot/channel
 */
class MonitoringService {
  constructor(config) {
    this.monitorBotToken = config.monitorBotToken || process.env.MONITOR_BOT_TOKEN;
    this.monitorChatId = config.monitorChatId || process.env.MONITOR_CHAT_ID;
    this.enabled = !!(this.monitorBotToken && this.monitorChatId);
    this.bot = null;

    if (this.enabled) {
      this.initializeBot();
    } else {
      console.log('Monitoring service disabled: Missing MONITOR_BOT_TOKEN or MONITOR_CHAT_ID');
    }
  }

  /**
   * Initialize the monitoring bot
   */
  initializeBot() {
    try {
      this.bot = new TelegramBot(this.monitorBotToken, { polling: false });
      console.log('Monitoring service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize monitoring bot:', error.message);
      this.enabled = false;
    }
  }

  /**
   * Forward results to monitoring channel
   * @param {string} message - Formatted result message
   * @returns {Promise<boolean>} Success status
   */
  async forwardResults(message) {
    if (!this.enabled || !this.bot) {
      console.log('Monitoring service not enabled, skipping forward');
      return false;
    }

    try {
      await this.bot.sendMessage(this.monitorChatId, message, {
        parse_mode: 'Markdown',
        disable_notification: false
      });
      console.log('Results forwarded to monitoring bot successfully');
      return true;
    } catch (error) {
      console.error('Error forwarding to monitoring bot:', error.message);
      // Don't throw - we don't want forwarding failures to affect user experience
      return false;
    }
  }

  /**
   * Send a custom message to monitoring channel
   * @param {string} message - Message to send
   * @param {Object} options - Telegram message options
   * @returns {Promise<boolean>} Success status
   */
  async sendMessage(message, options = {}) {
    if (!this.enabled || !this.bot) {
      return false;
    }

    try {
      await this.bot.sendMessage(this.monitorChatId, message, {
        parse_mode: 'Markdown',
        ...options
      });
      return true;
    } catch (error) {
      console.error('Error sending message to monitoring bot:', error.message);
      return false;
    }
  }

  /**
   * Send bot startup notification
   * @returns {Promise<boolean>}
   */
  async sendStartupNotification() {
    const message = `🤖 *QuickEnglishLevelBot Started*\n\n` +
      `📅 Time: ${new Date().toLocaleString()}\n` +
      `✅ Monitoring service connected`;
    
    return this.sendMessage(message);
  }

  /**
   * Send bot shutdown notification
   * @returns {Promise<boolean>}
   */
  async sendShutdownNotification() {
    const message = `🔴 *QuickEnglishLevelBot Stopping*\n\n` +
      `📅 Time: ${new Date().toLocaleString()}`;
    
    return this.sendMessage(message);
  }

  /**
   * Send daily statistics
   * @param {Object} stats - Statistics object
   * @returns {Promise<boolean>}
   */
  async sendDailyStats(stats) {
    let message = `📊 *Daily Statistics*\n\n`;
    message += `📅 Date: ${new Date().toLocaleDateString()}\n\n`;
    message += `*Sessions:*\n`;
    message += `• Total completed: ${stats.totalCompleted || 0}\n`;
    message += `• In progress: ${stats.inProgress || 0}\n\n`;
    
    if (stats.levelDistribution) {
      message += `*Level Distribution:*\n`;
      for (const [level, count] of Object.entries(stats.levelDistribution)) {
        message += `• ${level}: ${count}\n`;
      }
    }

    return this.sendMessage(message);
  }

  /**
   * Send error notification
   * @param {Error} error - Error object
   * @param {string} context - Context where error occurred
   * @returns {Promise<boolean>}
   */
  async sendErrorNotification(error, context = 'Unknown') {
    const message = `🚨 *Error Alert*\n\n` +
      `📍 Context: ${context}\n` +
      `❌ Error: ${error.message}\n` +
      `📅 Time: ${new Date().toLocaleString()}`;
    
    return this.sendMessage(message);
  }

  /**
   * Check if monitoring is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get monitoring status
   * @returns {Object}
   */
  getStatus() {
    return {
      enabled: this.enabled,
      hasBotToken: !!this.monitorBotToken,
      hasChatId: !!this.monitorChatId,
      botInitialized: !!this.bot
    };
  }
}

module.exports = MonitoringService;
