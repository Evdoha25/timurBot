const fs = require('fs');
const path = require('path');

/**
 * Question Service
 * Handles loading, validating, and selecting questions from JSON files
 */
class QuestionService {
  constructor(questionsPath = null) {
    this.questionsPath = questionsPath || path.join(__dirname, '../../data/questions.json');
    this.questions = [];
    this.loadQuestions();
  }

  /**
   * Load questions from JSON file
   * @throws {Error} If file cannot be read or parsed
   */
  loadQuestions() {
    try {
      const data = fs.readFileSync(this.questionsPath, 'utf8');
      const parsed = JSON.parse(data);
      this.questions = parsed.questions || [];
      this.validateQuestions();
      console.log(`Loaded ${this.questions.length} questions successfully`);
    } catch (error) {
      console.error('Error loading questions:', error.message);
      throw new Error(`Failed to load questions: ${error.message}`);
    }
  }

  /**
   * Validate question structure
   * @throws {Error} If questions are invalid
   */
  validateQuestions() {
    const requiredFields = ['id', 'text', 'options', 'correct', 'level', 'category'];
    const validLevels = ['A1', 'A2', 'B1', 'B2'];
    const validCategories = ['vocabulary', 'grammar'];

    for (const question of this.questions) {
      // Check required fields
      for (const field of requiredFields) {
        if (question[field] === undefined) {
          throw new Error(`Question ${question.id || 'unknown'} missing required field: ${field}`);
        }
      }

      // Validate options
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        throw new Error(`Question ${question.id} must have exactly 4 options`);
      }

      // Validate correct answer index
      if (question.correct < 0 || question.correct > 3) {
        throw new Error(`Question ${question.id} has invalid correct answer index`);
      }

      // Validate level
      if (!validLevels.includes(question.level)) {
        throw new Error(`Question ${question.id} has invalid level: ${question.level}`);
      }

      // Validate category
      if (!validCategories.includes(question.category)) {
        throw new Error(`Question ${question.id} has invalid category: ${question.category}`);
      }
    }
  }

  /**
   * Get all questions
   * @returns {Array} All questions
   */
  getAllQuestions() {
    return this.questions;
  }

  /**
   * Get questions by level
   * @param {string} level - CEFR level (A1, A2, B1, B2)
   * @returns {Array} Questions matching the level
   */
  getQuestionsByLevel(level) {
    return this.questions.filter(q => q.level === level);
  }

  /**
   * Get questions by category
   * @param {string} category - Category (vocabulary, grammar)
   * @returns {Array} Questions matching the category
   */
  getQuestionsByCategory(category) {
    return this.questions.filter(q => q.category === category);
  }

  /**
   * Get random questions for a test
   * @param {Object} config - Configuration object
   * @param {number} config.totalQuestions - Total number of questions
   * @param {Object} config.questionsPerLevel - Questions per level {A1: n, A2: n, ...}
   * @param {Object} config.questionsPerCategory - Questions per category {vocabulary: n, grammar: n}
   * @returns {Array} Selected questions
   */
  selectQuestionsForTest(config) {
    const { totalQuestions = 20, questionsPerLevel, questionsPerCategory } = config;
    const selectedQuestions = [];

    // If specific per-level configuration is provided
    if (questionsPerLevel) {
      for (const [level, count] of Object.entries(questionsPerLevel)) {
        const levelQuestions = this.getQuestionsByLevel(level);
        const selected = this.shuffleArray(levelQuestions).slice(0, count);
        selectedQuestions.push(...selected);
      }
    } else {
      // Default: equal distribution across levels
      const levels = ['A1', 'A2', 'B1', 'B2'];
      const perLevel = Math.floor(totalQuestions / levels.length);

      for (const level of levels) {
        const levelQuestions = this.getQuestionsByLevel(level);
        const selected = this.shuffleArray(levelQuestions).slice(0, perLevel);
        selectedQuestions.push(...selected);
      }
    }

    // Shuffle final selection
    return this.shuffleArray(selectedQuestions);
  }

  /**
   * Shuffle an array using Fisher-Yates algorithm
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get a question by ID
   * @param {number} id - Question ID
   * @returns {Object|null} Question or null if not found
   */
  getQuestionById(id) {
    return this.questions.find(q => q.id === id) || null;
  }

  /**
   * Check if an answer is correct
   * @param {number} questionId - Question ID
   * @param {number} selectedOption - Selected option index (0-3)
   * @returns {Object} Result with isCorrect and correctAnswer
   */
  checkAnswer(questionId, selectedOption) {
    const question = this.getQuestionById(questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    return {
      isCorrect: question.correct === selectedOption,
      correctAnswer: question.correct,
      correctOption: question.options[question.correct],
      selectedOption: selectedOption,
      weight: question.weight || 1
    };
  }

  /**
   * Get question statistics
   * @returns {Object} Statistics about loaded questions
   */
  getStats() {
    const stats = {
      total: this.questions.length,
      byLevel: {},
      byCategory: {}
    };

    // Count by level
    for (const level of ['A1', 'A2', 'B1', 'B2']) {
      stats.byLevel[level] = this.getQuestionsByLevel(level).length;
    }

    // Count by category
    for (const category of ['vocabulary', 'grammar']) {
      stats.byCategory[category] = this.getQuestionsByCategory(category).length;
    }

    return stats;
  }

  /**
   * Reload questions from file (useful for hot reloading)
   */
  reloadQuestions() {
    this.loadQuestions();
  }
}

module.exports = QuestionService;
