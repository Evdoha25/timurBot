const fs = require('fs');
const path = require('path');

/**
 * Callback Handlers
 * Handles inline keyboard callbacks for test flow
 */
class CallbackHandlers {
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
      console.error('Error loading config in callback handlers:', error.message);
      return { bot: {}, test: { totalQuestions: 20 } };
    }
  }

  /**
   * Handle callback queries
   * @param {Object} query - Telegram callback query object
   */
  async handleCallback(query) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;
    const messageId = query.message.message_id;

    try {
      // Answer callback to remove loading state
      await this.bot.answerCallbackQuery(query.id);

      // Route to appropriate handler
      if (data === 'start_test') {
        await this.handleStartTest(chatId, userId, messageId);
      } else if (data === 'show_instructions') {
        await this.handleShowInstructions(chatId, messageId);
      } else if (data.startsWith('answer_')) {
        await this.handleAnswer(chatId, userId, data, messageId);
      }
    } catch (error) {
      console.error('Error in handleCallback:', error);
      await this.bot.sendMessage(chatId, '❌ An error occurred. Please try /start again.');
    }
  }

  /**
   * Handle start test callback
   */
  async handleStartTest(chatId, userId, messageId) {
    const session = this.sessionService.getSession(userId);
    
    if (!session) {
      await this.bot.sendMessage(chatId, '⚠️ Session expired. Please use /start to begin.');
      return;
    }

    // Select questions for the test
    const questions = this.questionService.selectQuestionsForTest({
      totalQuestions: this.config.test.totalQuestions || 20,
      questionsPerLevel: this.config.test.questionsPerLevel
    });

    // Store questions in session
    this.sessionService.setQuestions(userId, questions);
    this.sessionService.updateSession(userId, { state: 'in_progress' });

    // Delete the welcome message
    try {
      await this.bot.deleteMessage(chatId, messageId);
    } catch (e) {
      // Message might already be deleted, ignore
    }

    // Send instructions briefly
    const instructionsMessage = this.config.bot.instructionsMessage || 
      '📝 Answer each question by selecting the correct option.';

    await this.bot.sendMessage(chatId, instructionsMessage, { parse_mode: 'Markdown' });

    // Send first question
    await this.sendQuestion(chatId, userId);
  }

  /**
   * Handle show instructions callback
   */
  async handleShowInstructions(chatId, messageId) {
    const instructionsMessage = this.config.bot.instructionsMessage || 
      '📝 Instructions:\n\n1. Each question has 4 options\n2. Select the correct answer\n3. Answer all questions to get results';

    await this.bot.sendMessage(chatId, instructionsMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📝 Start Test', callback_data: 'start_test' }]
        ]
      }
    });
  }

  /**
   * Handle answer callback
   */
  async handleAnswer(chatId, userId, data, messageId) {
    const session = this.sessionService.getSession(userId);
    
    if (!session) {
      await this.bot.sendMessage(chatId, '⚠️ Session expired. Please use /start to begin.');
      return;
    }

    if (session.state !== 'in_progress') {
      await this.bot.sendMessage(chatId, '⚠️ No active test. Please use /start to begin.');
      return;
    }

    // Parse answer data: answer_questionId_optionIndex
    const parts = data.split('_');
    const questionId = parseInt(parts[1]);
    const selectedOption = parseInt(parts[2]);

    // Get current question
    const currentQuestion = session.questions[session.currentQuestion];
    
    if (!currentQuestion || currentQuestion.id !== questionId) {
      await this.bot.sendMessage(chatId, '⚠️ Invalid answer. Please try again.');
      return;
    }

    // Check answer
    const result = this.questionService.checkAnswer(questionId, selectedOption);

    // Record answer in session
    this.sessionService.recordAnswer(userId, {
      questionId: questionId,
      selectedOption: selectedOption,
      isCorrect: result.isCorrect,
      weight: result.weight
    });

    // Delete the question message
    try {
      await this.bot.deleteMessage(chatId, messageId);
    } catch (e) {
      // Message might already be deleted, ignore
    }

    // Send feedback
    const feedbackEmoji = result.isCorrect ? '✅' : '❌';
    const feedbackText = result.isCorrect 
      ? 'Correct!' 
      : `Incorrect. The correct answer was: ${result.correctOption}`;
    
    await this.bot.sendMessage(chatId, `${feedbackEmoji} ${feedbackText}`);

    // Check if test is complete
    const updatedSession = this.sessionService.getSession(userId);
    if (this.sessionService.isTestComplete(userId)) {
      await this.completeTest(chatId, userId);
    } else {
      // Send next question
      await this.sendQuestion(chatId, userId);
    }
  }

  /**
   * Send a question to the user
   */
  async sendQuestion(chatId, userId) {
    const session = this.sessionService.getSession(userId);
    
    if (!session) {
      await this.bot.sendMessage(chatId, '⚠️ Session expired. Please use /start to begin.');
      return;
    }

    const question = session.questions[session.currentQuestion];
    if (!question) {
      await this.completeTest(chatId, userId);
      return;
    }

    // Generate progress indicator
    const progress = `${session.currentQuestion + 1}/${session.questions.length}`;
    const progressBar = this.assessmentService.generateProgressBar(
      session.currentQuestion + 1, 
      session.questions.length
    );

    // Format question message
    const optionLetters = ['A', 'B', 'C', 'D'];
    let questionText = `📝 *Question ${progress}*\n${progressBar}\n\n`;
    questionText += `${question.text}\n\n`;
    
    question.options.forEach((option, index) => {
      questionText += `${optionLetters[index]}. ${option}\n`;
    });

    // Create inline keyboard for options
    const keyboard = question.options.map((option, index) => [{
      text: `${optionLetters[index]}. ${option}`,
      callback_data: `answer_${question.id}_${index}`
    }]);

    await this.bot.sendMessage(chatId, questionText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  }

  /**
   * Complete the test and show results
   */
  async completeTest(chatId, userId) {
    const session = this.sessionService.getSession(userId);
    
    if (!session) {
      await this.bot.sendMessage(chatId, '⚠️ Session expired. Results not available.');
      return;
    }

    // Mark session as complete
    this.sessionService.completeSession(userId);

    // Send completion message
    const completionMessage = this.config.bot.completionMessage || 
      '🎉 Congratulations! You\'ve completed the test!';
    await this.bot.sendMessage(chatId, completionMessage);

    // Calculate assessment
    const assessment = this.assessmentService.calculateAssessment(session, session.questions);

    // Format and send results
    const resultMessage = this.assessmentService.formatResultMessage(assessment);
    await this.bot.sendMessage(chatId, resultMessage, { parse_mode: 'Markdown' });

    // Forward results to monitoring bot (asynchronously)
    if (this.monitoringService) {
      const monitoringMessage = this.assessmentService.formatMonitoringMessage(session, assessment);
      this.monitoringService.forwardResults(monitoringMessage).catch(err => {
        console.error('Error forwarding to monitoring bot:', err.message);
      });
    }

    // Clear session
    this.sessionService.clearSession(userId);

    // Offer to restart
    await this.bot.sendMessage(chatId, 
      '🔄 Would you like to take the test again?', 
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📝 Take Test Again', callback_data: 'start_test' }]
          ]
        }
      }
    );

    // Re-create session for potential restart
    this.sessionService.createSession(userId, session.username);
  }

  /**
   * Register callback handler
   */
  registerHandlers() {
    this.bot.on('callback_query', (query) => this.handleCallback(query));
  }
}

module.exports = CallbackHandlers;
