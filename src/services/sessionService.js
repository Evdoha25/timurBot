const NodeCache = require('node-cache');

/**
 * Session Management Service
 * Handles user sessions with automatic expiration and cleanup
 */
class SessionService {
  constructor(timeoutMinutes = 30) {
    // Initialize cache with TTL (time to live) in seconds
    this.cache = new NodeCache({
      stdTTL: timeoutMinutes * 60,
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false // For better performance with objects
    });

    this.timeoutMinutes = timeoutMinutes;
  }

  /**
   * Create a new session for a user
   * @param {number} userId - Telegram user ID
   * @param {string} username - Telegram username
   * @returns {Object} The created session
   */
  createSession(userId, username) {
    const session = {
      userId,
      username: username || null,
      startTime: new Date().toISOString(),
      answers: [],
      currentQuestion: 0,
      questions: [],
      score: 0,
      isComplete: false,
      state: 'ready' // States: ready, in_progress, completed, cancelled
    };

    this.cache.set(userId.toString(), session);
    return session;
  }

  /**
   * Get session for a user
   * @param {number} userId - Telegram user ID
   * @returns {Object|null} The session or null if not found
   */
  getSession(userId) {
    return this.cache.get(userId.toString()) || null;
  }

  /**
   * Update session data
   * @param {number} userId - Telegram user ID
   * @param {Object} updates - Object containing fields to update
   * @returns {Object|null} Updated session or null if not found
   */
  updateSession(userId, updates) {
    const session = this.getSession(userId);
    if (!session) {
      return null;
    }

    const updatedSession = { ...session, ...updates };
    this.cache.set(userId.toString(), updatedSession);
    return updatedSession;
  }

  /**
   * Record an answer in the session
   * @param {number} userId - Telegram user ID
   * @param {Object} answer - Answer object containing questionId, selectedOption, isCorrect
   * @returns {Object|null} Updated session or null if not found
   */
  recordAnswer(userId, answer) {
    const session = this.getSession(userId);
    if (!session) {
      return null;
    }

    const answerRecord = {
      questionId: answer.questionId,
      selectedOption: answer.selectedOption,
      isCorrect: answer.isCorrect,
      timestamp: new Date().toISOString()
    };

    session.answers.push(answerRecord);
    session.currentQuestion += 1;

    if (answer.isCorrect) {
      session.score += answer.weight || 1;
    }

    this.cache.set(userId.toString(), session);
    return session;
  }

  /**
   * Set the questions for a session
   * @param {number} userId - Telegram user ID
   * @param {Array} questions - Array of question objects
   * @returns {Object|null} Updated session or null if not found
   */
  setQuestions(userId, questions) {
    return this.updateSession(userId, { questions });
  }

  /**
   * Get current question for user
   * @param {number} userId - Telegram user ID
   * @returns {Object|null} Current question or null
   */
  getCurrentQuestion(userId) {
    const session = this.getSession(userId);
    if (!session || session.currentQuestion >= session.questions.length) {
      return null;
    }
    return session.questions[session.currentQuestion];
  }

  /**
   * Check if user has completed all questions
   * @param {number} userId - Telegram user ID
   * @returns {boolean}
   */
  isTestComplete(userId) {
    const session = this.getSession(userId);
    if (!session) {
      return false;
    }
    return session.currentQuestion >= session.questions.length;
  }

  /**
   * Mark session as complete
   * @param {number} userId - Telegram user ID
   * @returns {Object|null} Updated session or null
   */
  completeSession(userId) {
    return this.updateSession(userId, {
      isComplete: true,
      state: 'completed',
      endTime: new Date().toISOString()
    });
  }

  /**
   * Delete/clear a session
   * @param {number} userId - Telegram user ID
   * @returns {boolean} True if session was deleted
   */
  clearSession(userId) {
    return this.cache.del(userId.toString()) > 0;
  }

  /**
   * Get all active sessions (for monitoring)
   * @returns {Array} Array of active sessions
   */
  getAllSessions() {
    const keys = this.cache.keys();
    return keys.map(key => this.cache.get(key));
  }

  /**
   * Get count of active sessions
   * @returns {number}
   */
  getActiveSessionCount() {
    return this.cache.keys().length;
  }

  /**
   * Check if user has an active session
   * @param {number} userId - Telegram user ID
   * @returns {boolean}
   */
  hasSession(userId) {
    return this.cache.has(userId.toString());
  }

  /**
   * Reset session for restart
   * @param {number} userId - Telegram user ID
   * @param {string} username - Telegram username
   * @returns {Object} New session
   */
  resetSession(userId, username) {
    this.clearSession(userId);
    return this.createSession(userId, username);
  }

  /**
   * Get session statistics
   * @returns {Object} Stats object
   */
  getStats() {
    const sessions = this.getAllSessions();
    return {
      totalActive: sessions.length,
      inProgress: sessions.filter(s => s.state === 'in_progress').length,
      completed: sessions.filter(s => s.state === 'completed').length,
      ready: sessions.filter(s => s.state === 'ready').length
    };
  }
}

module.exports = SessionService;
