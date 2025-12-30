require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const SessionService = require('./services/sessionService');
const QuestionService = require('./services/questionService');
const AssessmentService = require('./services/assessmentService');
const MonitoringService = require('./services/monitoringService');
const CommandHandlers = require('./handlers/commandHandlers');
const CallbackHandlers = require('./handlers/callbackHandlers');

/**
 * QuickEnglishLevelBot - Main Entry Point
 * 
 * A Telegram bot that assesses English language proficiency level (A1-B2)
 * through vocabulary and grammar tests.
 */
class QuickEnglishLevelBot {
  constructor() {
    this.validateEnvironment();
    this.initializeServices();
    this.initializeBot();
    this.registerHandlers();
    this.setupGracefulShutdown();
  }

  /**
   * Validate required environment variables
   */
  validateEnvironment() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      console.error('❌ Error: TELEGRAM_BOT_TOKEN environment variable is required');
      console.error('Please create a .env file with your bot token or set the environment variable.');
      process.exit(1);
    }

    console.log('✅ Environment variables validated');
  }

  /**
   * Initialize all services
   */
  initializeServices() {
    try {
      // Session service with 30 minute timeout
      const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30;
      this.sessionService = new SessionService(sessionTimeout);
      console.log(`✅ Session service initialized (${sessionTimeout} min timeout)`);

      // Question service
      this.questionService = new QuestionService();
      const questionStats = this.questionService.getStats();
      console.log(`✅ Question service initialized (${questionStats.total} questions loaded)`);

      // Assessment service
      this.assessmentService = new AssessmentService();
      console.log('✅ Assessment service initialized');

      // Monitoring service (optional)
      this.monitoringService = new MonitoringService({
        monitorBotToken: process.env.MONITOR_BOT_TOKEN,
        monitorChatId: process.env.MONITOR_CHAT_ID
      });
      
      if (this.monitoringService.isEnabled()) {
        console.log('✅ Monitoring service initialized');
      } else {
        console.log('ℹ️  Monitoring service not configured (optional)');
      }
    } catch (error) {
      console.error('❌ Error initializing services:', error.message);
      process.exit(1);
    }
  }

  /**
   * Initialize Telegram bot
   */
  initializeBot() {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const pollingOptions = {
        polling: {
          interval: 300,
          autoStart: true,
          params: {
            timeout: 10
          }
        }
      };

      this.bot = new TelegramBot(token, pollingOptions);
      
      // Handle polling errors
      this.bot.on('polling_error', (error) => {
        console.error('Polling error:', error.message);
      });

      // Handle webhook errors
      this.bot.on('webhook_error', (error) => {
        console.error('Webhook error:', error.message);
      });

      console.log('✅ Telegram bot initialized');
    } catch (error) {
      console.error('❌ Error initializing Telegram bot:', error.message);
      process.exit(1);
    }
  }

  /**
   * Register all message and callback handlers
   */
  registerHandlers() {
    try {
      // Command handlers
      this.commandHandlers = new CommandHandlers(
        this.bot,
        this.sessionService,
        this.questionService,
        this.assessmentService,
        this.monitoringService
      );
      this.commandHandlers.registerHandlers();
      console.log('✅ Command handlers registered');

      // Callback handlers
      this.callbackHandlers = new CallbackHandlers(
        this.bot,
        this.sessionService,
        this.questionService,
        this.assessmentService,
        this.monitoringService
      );
      this.callbackHandlers.registerHandlers();
      console.log('✅ Callback handlers registered');

      // Handle unrecognized messages
      this.bot.on('message', (msg) => {
        // Only handle non-command text messages
        if (msg.text && !msg.text.startsWith('/')) {
          this.handleUnrecognizedMessage(msg);
        }
      });
    } catch (error) {
      console.error('❌ Error registering handlers:', error.message);
      process.exit(1);
    }
  }

  /**
   * Handle unrecognized messages
   */
  async handleUnrecognizedMessage(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Check if user has an active session in progress
    const session = this.sessionService.getSession(userId);
    
    if (session && session.state === 'in_progress') {
      await this.bot.sendMessage(
        chatId,
        '⚠️ Please select an answer from the options above.\n\nOr use:\n• /restart to start over\n• /cancel to cancel the test'
      );
    } else {
      await this.bot.sendMessage(
        chatId,
        '👋 Hi! Use /start to begin the English level assessment test.\n\nOr use /help for more information.'
      );
    }
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      
      // Send shutdown notification to monitoring
      if (this.monitoringService && this.monitoringService.isEnabled()) {
        await this.monitoringService.sendShutdownNotification();
      }

      // Stop polling
      if (this.bot) {
        await this.bot.stopPolling();
      }

      console.log('✅ Bot stopped successfully');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  /**
   * Start the bot
   */
  async start() {
    console.log('\n🤖 QuickEnglishLevelBot is starting...\n');
    
    // Send startup notification to monitoring
    if (this.monitoringService && this.monitoringService.isEnabled()) {
      await this.monitoringService.sendStartupNotification();
    }

    console.log('═══════════════════════════════════════');
    console.log('  🎓 QuickEnglishLevelBot is running!');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('Bot is ready to receive messages.');
    console.log('Press Ctrl+C to stop.\n');
  }
}

// Create and start the bot
const bot = new QuickEnglishLevelBot();
bot.start();
