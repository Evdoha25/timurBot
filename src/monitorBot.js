require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

/**
 * QuickEnglishLevelBot - Monitoring Bot
 * 
 * A separate bot that receives and logs test results from the main bot.
 * Provides admin commands to view statistics.
 */
class MonitorBot {
  constructor() {
    this.validateEnvironment();
    this.initializeBot();
    this.initializeStorage();
    this.registerHandlers();
    this.setupGracefulShutdown();
  }

  /**
   * Validate required environment variables
   */
  validateEnvironment() {
    const token = process.env.MONITOR_BOT_TOKEN;
    
    if (!token) {
      console.error('❌ Error: MONITOR_BOT_TOKEN environment variable is required');
      console.error('Please set the environment variable for the monitoring bot.');
      process.exit(1);
    }

    console.log('✅ Environment variables validated');
  }

  /**
   * Initialize Telegram bot
   */
  initializeBot() {
    try {
      const token = process.env.MONITOR_BOT_TOKEN;
      
      this.bot = new TelegramBot(token, { polling: true });
      
      // Handle polling errors
      this.bot.on('polling_error', (error) => {
        console.error('Polling error:', error.message);
      });

      console.log('✅ Monitoring bot initialized');
    } catch (error) {
      console.error('❌ Error initializing bot:', error.message);
      process.exit(1);
    }
  }

  /**
   * Initialize result storage
   */
  initializeStorage() {
    this.resultsFile = path.join(__dirname, '../data/results.json');
    
    // Create results file if it doesn't exist
    if (!fs.existsSync(this.resultsFile)) {
      const initialData = {
        results: [],
        statistics: {
          totalTests: 0,
          levelDistribution: { A1: 0, A2: 0, B1: 0, B2: 0 },
          averageScore: 0
        }
      };
      fs.writeFileSync(this.resultsFile, JSON.stringify(initialData, null, 2));
    }

    console.log('✅ Storage initialized');
  }

  /**
   * Load results from file
   */
  loadResults() {
    try {
      const data = fs.readFileSync(this.resultsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading results:', error.message);
      return { results: [], statistics: {} };
    }
  }

  /**
   * Save results to file
   */
  saveResults(data) {
    try {
      fs.writeFileSync(this.resultsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving results:', error.message);
    }
  }

  /**
   * Register all message handlers
   */
  registerHandlers() {
    // /start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      
      await this.bot.sendMessage(chatId, 
        '🔍 *QuickEnglishLevelBot Monitor*\n\n' +
        'This bot receives and logs test results from the main assessment bot.\n\n' +
        '*Available Commands:*\n' +
        '• /stats - View overall statistics\n' +
        '• /recent - View recent test results\n' +
        '• /export - Export all results\n' +
        '• /clear - Clear all stored results\n' +
        '• /chatid - Get this chat\'s ID for configuration',
        { parse_mode: 'Markdown' }
      );
    });

    // /chatid command - Get chat ID for configuration
    this.bot.onText(/\/chatid/, async (msg) => {
      const chatId = msg.chat.id;
      
      await this.bot.sendMessage(chatId,
        `📋 *Chat Information*\n\n` +
        `Chat ID: \`${chatId}\`\n\n` +
        `Use this ID as MONITOR_CHAT_ID in your .env file.`,
        { parse_mode: 'Markdown' }
      );
    });

    // /stats command
    this.bot.onText(/\/stats/, async (msg) => {
      const chatId = msg.chat.id;
      const data = this.loadResults();
      
      const stats = data.statistics || {};
      const levelDist = stats.levelDistribution || {};
      
      let message = `📊 *Overall Statistics*\n\n`;
      message += `📝 Total Tests: ${stats.totalTests || 0}\n`;
      message += `📈 Average Score: ${stats.averageScore || 0}%\n\n`;
      message += `*Level Distribution:*\n`;
      message += `• A1 (Beginner): ${levelDist.A1 || 0}\n`;
      message += `• A2 (Elementary): ${levelDist.A2 || 0}\n`;
      message += `• B1 (Intermediate): ${levelDist.B1 || 0}\n`;
      message += `• B2 (Upper-Int): ${levelDist.B2 || 0}`;
      
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // /recent command
    this.bot.onText(/\/recent/, async (msg) => {
      const chatId = msg.chat.id;
      const data = this.loadResults();
      
      const recentResults = data.results.slice(-10).reverse();
      
      if (recentResults.length === 0) {
        await this.bot.sendMessage(chatId, '📭 No test results recorded yet.');
        return;
      }
      
      let message = `📋 *Recent Test Results (Last 10)*\n\n`;
      
      recentResults.forEach((result, index) => {
        message += `${index + 1}. `;
        message += result.username ? `@${result.username}` : `User ${result.userId}`;
        message += ` - ${result.level} (${result.score}%)\n`;
        message += `   📅 ${new Date(result.timestamp).toLocaleString()}\n\n`;
      });
      
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // /export command
    this.bot.onText(/\/export/, async (msg) => {
      const chatId = msg.chat.id;
      const data = this.loadResults();
      
      if (data.results.length === 0) {
        await this.bot.sendMessage(chatId, '📭 No results to export.');
        return;
      }
      
      // Create CSV content
      let csv = 'User ID,Username,Level,Score,Vocabulary,Grammar,Timestamp\n';
      data.results.forEach(result => {
        csv += `${result.userId},${result.username || 'N/A'},${result.level},`;
        csv += `${result.score},${result.vocabulary || 'N/A'},${result.grammar || 'N/A'},`;
        csv += `${result.timestamp}\n`;
      });
      
      // Send as document
      const buffer = Buffer.from(csv, 'utf8');
      await this.bot.sendDocument(chatId, buffer, {
        caption: '📊 Test Results Export'
      }, {
        filename: `results_${Date.now()}.csv`,
        contentType: 'text/csv'
      });
    });

    // /clear command
    this.bot.onText(/\/clear/, async (msg) => {
      const chatId = msg.chat.id;
      
      await this.bot.sendMessage(chatId, 
        '⚠️ *Are you sure you want to clear all results?*\n\n' +
        'This action cannot be undone.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Yes, clear all', callback_data: 'confirm_clear' },
                { text: '❌ Cancel', callback_data: 'cancel_clear' }
              ]
            ]
          }
        }
      );
    });

    // Handle callback queries
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      const data = query.data;
      
      await this.bot.answerCallbackQuery(query.id);
      
      if (data === 'confirm_clear') {
        const initialData = {
          results: [],
          statistics: {
            totalTests: 0,
            levelDistribution: { A1: 0, A2: 0, B1: 0, B2: 0 },
            averageScore: 0
          }
        };
        this.saveResults(initialData);
        
        await this.bot.editMessageText(
          '🗑️ All results have been cleared.',
          { chat_id: chatId, message_id: query.message.message_id }
        );
      } else if (data === 'cancel_clear') {
        await this.bot.editMessageText(
          '✅ Clear operation cancelled.',
          { chat_id: chatId, message_id: query.message.message_id }
        );
      }
    });

    // Handle incoming result messages (forwarded from main bot)
    this.bot.on('message', async (msg) => {
      // Skip command messages
      if (msg.text && msg.text.startsWith('/')) return;
      
      // Check if message contains test results
      if (msg.text && msg.text.includes('New Test Completed')) {
        await this.processResultMessage(msg);
      }
    });

    console.log('✅ Handlers registered');
  }

  /**
   * Process incoming result message
   */
  async processResultMessage(msg) {
    try {
      const text = msg.text;
      
      // Parse the result message
      const userIdMatch = text.match(/User ID: `?(\d+)`?/);
      const usernameMatch = text.match(/Username: @(\w+)/);
      const levelMatch = text.match(/Level: \*?(\w+)\*?/);
      const scoreMatch = text.match(/Score: \*?(\d+)%\*?/);
      const vocabMatch = text.match(/Vocabulary: (\d+)%/);
      const grammarMatch = text.match(/Grammar: (\d+)%/);
      
      if (!userIdMatch || !levelMatch || !scoreMatch) {
        console.log('Could not parse result message');
        return;
      }
      
      const result = {
        userId: userIdMatch[1],
        username: usernameMatch ? usernameMatch[1] : null,
        level: levelMatch[1],
        score: parseInt(scoreMatch[1]),
        vocabulary: vocabMatch ? parseInt(vocabMatch[1]) : null,
        grammar: grammarMatch ? parseInt(grammarMatch[1]) : null,
        timestamp: new Date().toISOString()
      };
      
      // Load existing data
      const data = this.loadResults();
      
      // Add new result
      data.results.push(result);
      
      // Update statistics
      data.statistics.totalTests++;
      data.statistics.levelDistribution[result.level]++;
      
      // Recalculate average
      const totalScore = data.results.reduce((sum, r) => sum + r.score, 0);
      data.statistics.averageScore = Math.round(totalScore / data.results.length);
      
      // Save updated data
      this.saveResults(data);
      
      console.log(`✅ Recorded result: ${result.username || result.userId} - ${result.level} (${result.score}%)`);
      
      // Send confirmation
      await this.bot.sendMessage(msg.chat.id, 
        `✅ Result recorded: ${result.level} (${result.score}%)`,
        { reply_to_message_id: msg.message_id }
      );
    } catch (error) {
      console.error('Error processing result:', error.message);
    }
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down...`);
      
      if (this.bot) {
        await this.bot.stopPolling();
      }

      console.log('✅ Monitoring bot stopped');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  /**
   * Start the bot
   */
  start() {
    console.log('\n🔍 QuickEnglishLevelBot Monitor is starting...\n');
    console.log('═══════════════════════════════════════════');
    console.log('  🔍 Monitoring Bot is running!');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('Ready to receive test results.');
    console.log('Press Ctrl+C to stop.\n');
  }
}

// Create and start the monitoring bot
const monitor = new MonitorBot();
monitor.start();
